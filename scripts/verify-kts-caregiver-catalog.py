#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pypdf>=5.0.0",
# ]
# ///
"""Verify KTS catalog structure, content, fonts, links, color, and deploy copies."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader
from pypdf.generic import DictionaryObject, IndirectObject


REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANY_ROOT = REPO_ROOT / "company"
OUTPUT_ROOT = REPO_ROOT / "output" / "pdf"
PUBLIC_ROOT = COMPANY_ROOT / "public" / "downloads"
BUNDLED_FONT_FILES = (
    COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-Regular.woff2",
    COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-Bold.woff2",
    COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-OFL.txt",
    COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-NOTICE.md",
)
A4_WIDTH = 595.2755905511812
A4_HEIGHT = 841.8897637795277
MAX_BYTES = 10 * 1024 * 1024

JA_REJECTED_COPY = (
    "主要学習モジュール",
    "現場記録",
    "講義と実習を統合",
    "モジュール＋統合プロジェクト",
    "技術だけを反復するのではありません。介護の倫理と安全を軸に、準備、実施、片付け、記録までを一つの業務単位として学びます。",
    "尊重ある対話",
    "活動 · 対話 · 観察 · 報告",
    "筆記 · 実技 · 最終実技・口頭試問",
    "筆記・実技・最終実技・口頭試問",
    "KTSの正式MOUパートナーとして、日本・韓国での連携営業を担います",
    "事業開発・パートナー開拓・連携営業窓口",
)


def dereference(value: Any) -> Any:
    return value.get_object() if isinstance(value, IndirectObject) else value


def exporter_data(locale: str) -> dict[str, Any]:
    completed = subprocess.run(
        ["node", "--import", "tsx", "scripts/export-lp-v1-catalog.ts", "--locale", locale],
        cwd=COMPANY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def compact_text(value: str) -> str:
    return re.sub(r"\s+", "", value)


def iter_font_dictionaries(page: Any) -> Iterable[DictionaryObject]:
    resources = dereference(page.get("/Resources", {}))
    fonts = dereference(resources.get("/Font", {}))
    for font_ref in fonts.values():
        font = dereference(font_ref)
        if isinstance(font, DictionaryObject):
            yield font


def font_descriptor(font: DictionaryObject) -> DictionaryObject | None:
    descriptor = dereference(font.get("/FontDescriptor"))
    if isinstance(descriptor, DictionaryObject):
        return descriptor
    descendants = dereference(font.get("/DescendantFonts", []))
    for descendant_ref in descendants:
        descendant = dereference(descendant_ref)
        descriptor = dereference(descendant.get("/FontDescriptor"))
        if isinstance(descriptor, DictionaryObject):
            return descriptor
    return None


def color_space_name(value: Any) -> str:
    value = dereference(value)
    if isinstance(value, list) and value:
        return str(dereference(value[0]))
    return str(value)


def image_resolution_summary(pdf_path: Path) -> tuple[int, int]:
    """Return image count and minimum effective PPI from Poppler's placement analysis."""
    completed = subprocess.run(
        ["pdfimages", "-list", str(pdf_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    ppi_values: list[int] = []
    for line in completed.stdout.splitlines():
        columns = line.split()
        if len(columns) < 16 or not columns[0].isdigit() or columns[2] != "image":
            continue
        ppi_values.extend((int(columns[12]), int(columns[13])))
    assert ppi_values, f"pdfimages found no placed raster images in {pdf_path}"
    return len(ppi_values) // 2, min(ppi_values)


def verify_one(locale: str) -> dict[str, Any]:
    data = exporter_data(locale)
    for bundled_font_file in BUNDLED_FONT_FILES:
        assert bundled_font_file.is_file(), f"missing bundled OFL font resource: {bundled_font_file}"
    canonical = OUTPUT_ROOT / f"kts-caregiver-catalog-{locale}-v1.pdf"
    deployed = PUBLIC_ROOT / canonical.name
    assert canonical.is_file(), f"missing canonical PDF: {canonical}"
    assert deployed.is_file(), f"missing deployed PDF: {deployed}"

    canonical_bytes = canonical.read_bytes()
    deployed_bytes = deployed.read_bytes()
    assert canonical_bytes.startswith(b"%PDF-"), f"invalid PDF header: {canonical}"
    assert 100_000 < len(canonical_bytes) < MAX_BYTES, f"unexpected PDF size: {len(canonical_bytes)}"
    assert canonical_bytes == deployed_bytes, f"deploy copy is not byte-identical: {deployed}"

    reader = PdfReader(canonical, strict=True)
    assert not reader.is_encrypted, "catalog must not be encrypted"
    assert len(reader.pages) == 4, f"expected exactly four pages, got {len(reader.pages)}"

    metadata = reader.metadata
    assert metadata is not None
    assert metadata.title == data["metadata"]["title"]
    assert metadata.subject == data["metadata"]["description"]
    assert metadata.author == data["contact"]["legalName"]["ko"]
    assert metadata.creator == "KTS caregiver catalog generator · ReportLab"
    assert metadata.producer and "ReportLab" in metadata.producer

    text_parts: list[str] = []
    uris: list[str] = []
    embedded_cjk_fonts: set[str] = set()
    embedded_cjk_styles: set[str] = set()
    image_count = 0
    image_color_spaces: set[str] = set()
    content_streams: list[bytes] = []

    for page_number, page in enumerate(reader.pages, start=1):
        box = page.mediabox
        assert abs(float(box.width) - A4_WIDTH) < 0.02, f"page {page_number} is not A4 width"
        assert abs(float(box.height) - A4_HEIGHT) < 0.02, f"page {page_number} is not A4 height"
        crop = page.cropbox
        assert abs(float(crop.width) - A4_WIDTH) < 0.02 and abs(float(crop.height) - A4_HEIGHT) < 0.02
        assert int(page.get("/Rotate", 0)) == 0
        for forbidden_box in ("/BleedBox", "/TrimBox", "/ArtBox"):
            assert forbidden_box not in page, f"page {page_number} unexpectedly defines {forbidden_box}"

        extracted = page.extract_text()
        assert extracted, f"page {page_number} has no selectable text"
        text_parts.append(extracted)

        contents = page.get_contents()
        if contents is not None:
            content_streams.append(contents.get_data())

        resources = dereference(page.get("/Resources", {}))
        xobjects = dereference(resources.get("/XObject", {}))
        for object_ref in xobjects.values():
            obj = dereference(object_ref)
            if obj.get("/Subtype") == "/Image":
                image_count += 1
                image_color_spaces.add(color_space_name(obj.get("/ColorSpace")))

        for font in iter_font_dictionaries(page):
            base_name = str(font.get("/BaseFont", ""))
            descriptor = font_descriptor(font)
            to_unicode = font.get("/ToUnicode") is not None
            embedded = bool(
                descriptor
                and any(descriptor.get(key) is not None for key in ("/FontFile", "/FontFile2", "/FontFile3"))
            )
            if "KTSCatalogSans" in base_name and to_unicode and embedded:
                embedded_cjk_fonts.add(base_name)
                if "Regular" in base_name:
                    embedded_cjk_styles.add("Regular")
                if "Bold" in base_name:
                    embedded_cjk_styles.add("Bold")

        annotations = dereference(page.get("/Annots", []))
        for annotation_ref in annotations:
            annotation = dereference(annotation_ref)
            if annotation.get("/Subtype") != "/Link":
                continue
            action = dereference(annotation.get("/A", {}))
            uri = action.get("/URI")
            if uri:
                uris.append(str(uri))

    extracted_text = "\n".join(text_parts)
    compact = compact_text(extracted_text)
    compact_pages = [compact_text(text) for text in text_parts]
    copy = data["copy"]
    hero = copy["hero"]
    facts = copy["facts"]
    curriculum = copy["curriculum"]
    workflow = copy["workflow"]
    completion = copy["completion"]
    partnership = copy["partnership"]

    page_anchors: dict[int, list[str]] = {
        1: [
            *hero["titleLines"],
            hero["description"],
            hero["imageCaption"],
            hero["evidenceLabel"],
            *(value for key in ("programLabel", "programBasis") if (value := hero.get(key))),
            *(item[key] for item in facts["items"] for key in ("label", "value", "note")),
            facts["evaluationLabel"],
            facts["evaluation"],
        ],
        2: [
            curriculum["title"],
            curriculum["description"],
            *(domain[key] for domain in curriculum["domains"] for key in ("title", "description", "detail")),
            workflow["title"],
        ],
        3: [
            copy["gallery"]["title"],
            copy["gallery"]["description"],
            "TRAINING / PRACTICE",
            "01 - 06",
            "VISITS / PARTNERSHIP DIALOGUE",
            "07 - 16",
        ],
        4: [
            completion["title"],
            completion["description"],
            *(item[key] for item in completion["items"] for key in ("label", "value")),
            completion["disclaimerTitle"],
            completion["disclaimer"],
            data["contact"]["email"],
            data["sourceUrl"],
        ],
    }
    if locale == "ja":
        page_anchors[4].extend(
            (
                partnership["badge"],
                partnership["title"],
                partnership["description"],
                partnership["joongwoo"]["role"],
            )
        )
    for page_number, anchors in page_anchors.items():
        page_text = compact_pages[page_number - 1]
        for anchor in anchors:
            assert compact_text(anchor) in page_text, (
                f"page {page_number} is missing selectable text anchor: {anchor!r}"
            )

    page_three_text = compact_pages[2]
    for item in data["gallery"]:
        assert compact_text(item["caption"]) not in page_three_text, (
            f"page 3 must not render image captions: {item['caption']!r}"
        )

    assert "\ufffd" not in extracted_text, "replacement glyph found in selectable text"
    cjk_characters = sum(
        1
        for character in extracted_text
        if "CJK" in unicodedata.name(character, "") or "HANGUL" in unicodedata.name(character, "")
    )
    assert cjk_characters >= 150, f"too little selectable CJK text: {cjk_characters} characters"
    assert embedded_cjk_styles == {"Regular", "Bold"}, (
        f"expected embedded regular/bold CJK fonts, got {embedded_cjk_fonts}"
    )

    expected_mail = f"mailto:{data['contact']['email']}?subject="
    assert any(uri.startswith(expected_mail) for uri in uris), "clickable email link is missing"
    assert data["sourceUrl"] in uris, "official source link is missing"
    if locale == "ja":
        assert data["landingUrl"] in uris, "locale landing-page/QR link is missing"
    else:
        # The approved KO PDF is frozen; its /lp/v1 target remains a permanent redirect.
        legacy_landing_url = f"{data['contact']['siteUrl'].rstrip('/')}/lp/v1"
        assert data["landingUrl"] in uris or legacy_landing_url in uris, (
            "Korean landing-page/QR link is missing"
        )
    assert len(uris) >= 5, f"expected at least five link annotations, got {len(uris)}"

    assert image_count >= 17, f"expected hero and all 16 gallery images, got {image_count}"
    assert image_color_spaces == {"/DeviceRGB"}, f"non-RGB images found: {image_color_spaces}"
    placed_image_count, minimum_image_ppi = image_resolution_summary(canonical)
    assert placed_image_count >= 17, f"expected 17 placed images, got {placed_image_count}"
    assert minimum_image_ppi >= 180, f"image placement below 180 PPI: {minimum_image_ppi}"
    joined_content = b"\n".join(content_streams)
    cmyk_operator = re.compile(rb"(?:^|\s)(?:-?\d*\.?\d+\s+){4}[kK](?:\s|$)")
    assert not cmyk_operator.search(joined_content), "CMYK drawing operator found"
    assert b"/DeviceCMYK" not in canonical_bytes, "DeviceCMYK color space found"

    banned_claim_fragments = ("154시간", "154時間", "83%", "MOU 체결일", "MOU締結日")
    for fragment in banned_claim_fragments:
        assert compact_text(fragment) not in compact, f"unsupported claim found: {fragment}"

    if locale == "ja":
        for fragment in JA_REJECTED_COPY:
            assert compact_text(fragment) not in compact, f"superseded Japanese copy found: {fragment}"

    return {
        "locale": locale,
        "path": str(canonical.relative_to(REPO_ROOT)),
        "bytes": len(canonical_bytes),
        "sha256": hashlib.sha256(canonical_bytes).hexdigest(),
        "pages": len(reader.pages),
        "images": image_count,
        "minimumImagePpi": minimum_image_ppi,
        "links": len(uris),
        "cjkCharacters": cjk_characters,
        "embeddedCjkFonts": sorted(embedded_cjk_fonts),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locale", choices=("ko", "ja", "all"), default="all")
    args = parser.parse_args()
    locales = ("ko", "ja") if args.locale == "all" else (args.locale,)
    results = [verify_one(locale) for locale in locales]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, FileNotFoundError, ValueError, subprocess.CalledProcessError) as error:
        print(f"verification failed: {error}", file=sys.stderr)
        sys.exit(1)
