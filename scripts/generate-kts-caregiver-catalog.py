#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "fonttools[woff]>=4.58.0",
#   "Pillow>=11.0.0",
#   "reportlab>=4.2.0",
# ]
# ///
"""Generate the four-page Korean and Japanese KTS caregiver catalogs."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote

from PIL import Image, ImageOps
from fontTools.ttLib import TTFont as FontToolsTTFont
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


REPO_ROOT = Path(__file__).resolve().parents[1]
TMP_ROOT = REPO_ROOT / "tmp" / "pdfs"
OUTPUT_ROOT = REPO_ROOT / "output" / "pdf"
PUBLIC_ROOT = REPO_ROOT / "company" / "public" / "downloads"
COMPANY_ROOT = REPO_ROOT / "company"

PAGE_W, PAGE_H = A4
MARGIN = 36.0
CONTENT_W = PAGE_W - (MARGIN * 2)
REGULAR_FONT = "KtsCatalog-Regular"
BOLD_FONT = "KtsCatalog-Bold"
BUNDLED_FONT_REGULAR = COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-Regular.woff2"
BUNDLED_FONT_BOLD = COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-Bold.woff2"
BUNDLED_FONT_LICENSE = COMPANY_ROOT / "app" / "fonts" / "KtsCatalogSans-OFL.txt"


def resolve_local_font(filenames: Iterable[str]) -> Path:
    font_dir = Path(os.environ.get("KTS_CATALOG_FONT_DIR", Path.home() / "Library" / "Fonts")).expanduser()
    candidates = [font_dir / filename for filename in filenames]
    candidates.extend(Path("/Library/Fonts") / filename for filename in filenames)
    candidates.extend(Path("/usr/share/fonts/truetype/noto") / filename for filename in filenames)
    for path in candidates:
        if path.is_file():
            return path.resolve()
    searched = "\n  - ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        f"Could not find a fallback embeddable KO/JA TTF. Searched:\n  - {searched}\n"
        "Set KTS_CATALOG_FONT_REGULAR and KTS_CATALOG_FONT_BOLD, or KTS_CATALOG_FONT_DIR."
    )


def set_static_font_names(font: FontToolsTTFont, family: str, style: str) -> None:
    postscript_name = f"{family.replace(' ', '')}-{style}"
    full_name = f"{family} {style}"
    name_table = font["name"]
    for platform_id, encoding_id, language_id in ((3, 1, 0x409), (1, 0, 0)):
        name_table.setName(family, 1, platform_id, encoding_id, language_id)
        name_table.setName(style, 2, platform_id, encoding_id, language_id)
        name_table.setName(full_name, 4, platform_id, encoding_id, language_id)
        name_table.setName(postscript_name, 6, platform_id, encoding_id, language_id)
        name_table.setName(family, 16, platform_id, encoding_id, language_id)
        name_table.setName(style, 17, platform_id, encoding_id, language_id)


def convert_bundled_font(source: Path, destination: Path, style: str) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    font = FontToolsTTFont(str(source), recalcBBoxes=False, recalcTimestamp=False)
    font.flavor = None
    set_static_font_names(font, "KTS Catalog Sans", style)
    font.save(str(destination), reorderTables=True)
    return destination


def assert_cjk_coverage(font_path: Path) -> None:
    font = FontToolsTTFont(str(font_path), lazy=True)
    cmap = font.getBestCmap() or {}
    required = "돌봄교육과정介護研修修了"
    missing = [character for character in required if ord(character) not in cmap]
    font.close()
    if missing:
        raise ValueError(f"Font does not cover required KO/JA glyphs ({''.join(missing)}): {font_path}")


def font_pair() -> tuple[Path, Path]:
    regular_override = os.environ.get("KTS_CATALOG_FONT_REGULAR")
    bold_override = os.environ.get("KTS_CATALOG_FONT_BOLD")
    if regular_override or bold_override:
        if not (regular_override and bold_override):
            raise ValueError("Set both KTS_CATALOG_FONT_REGULAR and KTS_CATALOG_FONT_BOLD together")
        regular = Path(regular_override).expanduser().resolve()
        bold = Path(bold_override).expanduser().resolve()
        if not regular.is_file() or not bold.is_file():
            raise FileNotFoundError("One or both KTS_CATALOG_FONT_* overrides do not point to files")
        return regular, bold

    if BUNDLED_FONT_REGULAR.is_file() and BUNDLED_FONT_BOLD.is_file():
        if not BUNDLED_FONT_LICENSE.is_file():
            raise FileNotFoundError(f"Bundled OFL notice is missing: {BUNDLED_FONT_LICENSE}")
        font_root = TMP_ROOT / "fonts"
        return (
            convert_bundled_font(BUNDLED_FONT_REGULAR, font_root / "KtsCatalogSans-Regular.ttf", "Regular"),
            convert_bundled_font(BUNDLED_FONT_BOLD, font_root / "KtsCatalogSans-Bold.ttf", "Bold"),
        )

    return (
        resolve_local_font(("SpoqaHanSansNeo-Regular.ttf", "NotoSansCJK-Regular.ttf", "NotoSans-Regular.ttf")),
        resolve_local_font(("SpoqaHanSansNeo-Bold.ttf", "NotoSansCJK-Bold.ttf", "NotoSans-Bold.ttf")),
    )


def register_fonts() -> tuple[Path, Path]:
    regular, bold = font_pair()
    assert_cjk_coverage(regular)
    assert_cjk_coverage(bold)
    pdfmetrics.registerFont(TTFont(REGULAR_FONT, str(regular), validate=1))
    pdfmetrics.registerFont(TTFont(BOLD_FONT, str(bold), validate=1))
    return regular, bold


def load_catalog_data(locale: str) -> dict[str, Any]:
    command = [
        "node",
        "--import",
        "tsx",
        "scripts/export-lp-v1-catalog.ts",
        "--locale",
        locale,
    ]
    completed = subprocess.run(
        command,
        cwd=COMPANY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(completed.stdout)
    if data.get("locale") != locale or data.get("schemaVersion") != 1:
        raise ValueError("Unexpected catalog exporter payload")
    if len(data.get("gallery", [])) != 6:
        raise ValueError("Catalog exporter must provide exactly six PDF gallery images")

    TMP_ROOT.mkdir(parents=True, exist_ok=True)
    snapshot = TMP_ROOT / f"kts-caregiver-catalog-{locale}-data.json"
    snapshot.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def palette(data: dict[str, Any], key: str) -> Color:
    return HexColor(data["palette"][key])


def string_width(text: str, font_name: str, font_size: float) -> float:
    return pdfmetrics.stringWidth(text, font_name, font_size)


def wrap_text(
    text: str,
    width: float,
    font_name: str,
    font_size: float,
    locale: str,
    max_lines: int | None = None,
) -> list[str]:
    """Wrap CJK text while preferring Korean word boundaries and ASCII runs."""
    if not text:
        return []

    lines: list[str] = []
    remaining = text.strip()
    ja_forbidden_start = "、。，．・：；？！)]}〉》」』】〕］）…"
    ja_forbidden_end = "([{〈《「『【〔［（"
    while remaining:
        if string_width(remaining, font_name, font_size) <= width:
            lines.append(remaining)
            break

        split_at = 1
        last_break = -1
        for index in range(1, len(remaining) + 1):
            candidate = remaining[:index]
            if string_width(candidate, font_name, font_size) > width:
                split_at = max(1, index - 1)
                break
            split_at = index
            previous = remaining[index - 1]
            if previous.isspace() or previous in "·・/,:;!?。、，：；！？)）]】":
                last_break = index

        if locale == "ko" and last_break > 0 and last_break >= int(split_at * 0.58):
            split_at = last_break
        elif locale == "ja":
            ascii_breaks = [match.end() for match in re.finditer(r"[\s/,:;!?-]+", remaining[:split_at])]
            if ascii_breaks and ascii_breaks[-1] >= int(split_at * 0.58):
                split_at = ascii_breaks[-1]
            # Basic kinsoku shori: do not leave Japanese closing punctuation at
            # the start of the next line or an opening mark at the line end.
            tail = remaining[split_at:]
            if tail and all(character in ja_forbidden_start for character in tail):
                split_at = len(remaining)
            elif split_at < len(remaining) and remaining[split_at] in ja_forbidden_start:
                split_at = max(1, split_at - 1)
            while split_at > 1 and remaining[split_at - 1] in ja_forbidden_end:
                split_at -= 1

        line = remaining[:split_at].rstrip()
        remaining = remaining[split_at:].lstrip()
        lines.append(line)

        if max_lines is not None and len(lines) >= max_lines:
            if remaining:
                ellipsis = "…"
                clipped = lines[-1]
                while clipped and string_width(clipped + ellipsis, font_name, font_size) > width:
                    clipped = clipped[:-1]
                lines[-1] = clipped.rstrip() + ellipsis
            break
    return lines


def draw_wrapped(
    canvas: Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font_name: str,
    font_size: float,
    leading: float,
    color: Color,
    locale: str,
    max_lines: int | None = None,
) -> float:
    lines = wrap_text(text, width, font_name, font_size, locale, max_lines)
    canvas.setFillColor(color)
    canvas.setFont(font_name, font_size)
    for line in lines:
        canvas.drawString(x, y, line)
        y -= leading
    return y


def rounded_rect(
    canvas: Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    radius: float,
    fill: Color,
    stroke: Color | None = None,
    stroke_width: float = 1,
) -> None:
    canvas.saveState()
    canvas.setFillColor(fill)
    if stroke is None:
        canvas.setStrokeColor(fill)
        canvas.setLineWidth(0)
    else:
        canvas.setStrokeColor(stroke)
        canvas.setLineWidth(stroke_width)
    canvas.roundRect(x, y, width, height, radius, stroke=int(stroke is not None), fill=1)
    canvas.restoreState()


def parse_object_position(value: str) -> tuple[float, float]:
    match = re.fullmatch(r"\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*", value)
    if not match:
        return 0.5, 0.5
    return float(match.group(1)) / 100, float(match.group(2)) / 100


def prepare_photo(
    source: Path,
    destination: Path,
    target_width: int,
    target_height: int,
    object_position: str,
) -> Path:
    if not source.is_file():
        raise FileNotFoundError(f"Image source is missing: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    pos_x, pos_y = parse_object_position(object_position)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        source_w, source_h = image.size
        target_ratio = target_width / target_height
        source_ratio = source_w / source_h
        if source_ratio > target_ratio:
            crop_w = max(1, round(source_h * target_ratio))
            left = round((source_w - crop_w) * pos_x)
            box = (left, 0, left + crop_w, source_h)
        else:
            crop_h = max(1, round(source_w / target_ratio))
            top = round((source_h - crop_h) * pos_y)
            box = (0, top, source_w, top + crop_h)
        image = image.crop(box)
        image.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        if image.size != (target_width, target_height):
            image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=88, optimize=True, progressive=True, subsampling=1)
    return destination


def draw_clipped_photo(
    canvas: Canvas,
    image_path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
    radius: float,
) -> None:
    canvas.saveState()
    clip = canvas.beginPath()
    clip.roundRect(x, y, width, height, radius)
    canvas.clipPath(clip, stroke=0, fill=0)
    canvas.drawImage(str(image_path), x, y, width=width, height=height, preserveAspectRatio=False, mask="auto")
    canvas.restoreState()


def draw_eyebrow(canvas: Canvas, text: str, x: float, y: float, color: Color, size: float = 8.0) -> None:
    canvas.setFillColor(color)
    canvas.setFont(BOLD_FONT, size)
    canvas.drawString(x, y, text)


def draw_footer(canvas: Canvas, data: dict[str, Any], page_number: int, light: bool = False) -> None:
    ink = colors.white if light else palette(data, "muted")
    line = Color(1, 1, 1, alpha=0.22) if light else palette(data, "line")
    canvas.setStrokeColor(line)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 44, PAGE_W - MARGIN, 44)
    canvas.setFillColor(ink)
    canvas.setFont(REGULAR_FONT, 7.2)
    canvas.drawString(MARGIN, 27, data["copy"]["footer"]["description"])
    canvas.drawRightString(PAGE_W - MARGIN, 27, f"{page_number:02d} / 04   ·   {data['catalogVersion'].upper()}")


def draw_qr(canvas: Canvas, value: str, x: float, y: float, size: float, data: dict[str, Any]) -> None:
    qr = QrCodeWidget(value)
    qr.barFillColor = palette(data, "deepCobalt")
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    rounded_rect(canvas, x - 7, y - 7, size + 14, size + 14, 8, colors.white)
    renderPDF.draw(drawing, canvas, x, y)
    canvas.linkURL(value, (x - 7, y - 7, x + size + 7, y + size + 7), relative=0, thickness=0)


def draw_page_one(canvas: Canvas, data: dict[str, Any], prepared: dict[str, Path]) -> None:
    locale = data["locale"]
    copy = data["copy"]
    canvas.setFillColor(palette(data, "paper"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    canvas.setFillColor(palette(data, "cobaltSoft"))
    canvas.circle(PAGE_W + 12, PAGE_H - 68, 118, stroke=0, fill=1)
    canvas.setFillColor(palette(data, "claySoft"))
    canvas.circle(-28, 438, 88, stroke=0, fill=1)

    draw_eyebrow(canvas, copy["hero"]["eyebrow"], MARGIN, 800, palette(data, "cobalt"), 8.2)
    canvas.setFillColor(palette(data, "muted"))
    canvas.setFont(BOLD_FONT, 7.8)
    canvas.drawRightString(PAGE_W - MARGIN, 800, "KTS  ×  JOONG WOO HRD")

    title_size = 31 if locale == "ko" else 28
    title_leading = 38 if locale == "ko" else 34
    title_y = 751
    for index, line in enumerate(copy["hero"]["titleLines"]):
        canvas.setFillColor(palette(data, "ink") if index == 0 else palette(data, "cobalt"))
        canvas.setFont(BOLD_FONT, title_size)
        canvas.drawString(MARGIN, title_y, line)
        title_y -= title_leading
    description_y = title_y - (2 if locale == "ko" else 0)
    draw_wrapped(
        canvas,
        copy["hero"]["description"],
        MARGIN,
        description_y,
        CONTENT_W - 8,
        REGULAR_FONT,
        10.3,
        16.2,
        palette(data, "muted"),
        locale,
        3,
    )

    hero_x, hero_y, hero_w, hero_h = MARGIN, 290, CONTENT_W, 292
    rounded_rect(canvas, hero_x - 1, hero_y - 1, hero_w + 2, hero_h + 2, 18, palette(data, "line"))
    draw_clipped_photo(canvas, prepared["hero"], hero_x, hero_y, hero_w, hero_h, 17)
    canvas.saveState()
    canvas.setFillColor(Color(0.04, 0.07, 0.12, alpha=0.62))
    canvas.roundRect(hero_x, hero_y, hero_w, 52, 17, stroke=0, fill=1)
    canvas.rect(hero_x, hero_y + 17, hero_w, 35, stroke=0, fill=1)
    canvas.restoreState()
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD_FONT, 9.2)
    canvas.drawString(hero_x + 16, hero_y + 20, copy["hero"]["imageCaption"])
    badge = copy["hero"]["evidenceLabel"]
    badge_w = string_width(badge, BOLD_FONT, 7.2) + 22
    canvas.setStrokeColor(Color(1, 1, 1, alpha=0.5))
    canvas.setFillColor(Color(1, 1, 1, alpha=0.12))
    canvas.roundRect(hero_x + hero_w - badge_w - 14, hero_y + 13, badge_w, 25, 12.5, stroke=1, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD_FONT, 7.2)
    canvas.drawCentredString(hero_x + hero_w - badge_w / 2 - 14, hero_y + 22, badge)

    facts_y, facts_h = 125, 124
    rounded_rect(canvas, MARGIN, facts_y, CONTENT_W, facts_h, 14, palette(data, "surface"), palette(data, "line"), 0.8)
    fact_w = CONTENT_W / 3
    for index, fact in enumerate(copy["facts"]["items"]):
        x = MARGIN + index * fact_w
        if index:
            canvas.setStrokeColor(palette(data, "line"))
            canvas.setLineWidth(0.7)
            canvas.line(x, facts_y + 18, x, facts_y + facts_h - 18)
        canvas.setFillColor(palette(data, "muted"))
        canvas.setFont(BOLD_FONT, 7.4)
        canvas.drawString(x + 16, facts_y + 91, fact["label"])
        canvas.setFillColor(palette(data, "ink"))
        canvas.setFont(BOLD_FONT, 23)
        canvas.drawString(x + 16, facts_y + 53, fact["value"])
        draw_wrapped(
            canvas,
            fact["note"],
            x + 16,
            facts_y + 29,
            fact_w - 30,
            REGULAR_FONT,
            7.5,
            10,
            palette(data, "muted"),
            locale,
            2,
        )

    canvas.setFillColor(palette(data, "cobalt"))
    canvas.setFont(BOLD_FONT, 7.8)
    canvas.drawString(MARGIN, 96, copy["facts"]["evaluationLabel"])
    canvas.setFillColor(palette(data, "muted"))
    canvas.setFont(REGULAR_FONT, 8.2)
    canvas.drawRightString(PAGE_W - MARGIN, 96, copy["facts"]["evaluation"])
    draw_footer(canvas, data, 1)
    canvas.showPage()


def draw_domain_card(
    canvas: Canvas,
    data: dict[str, Any],
    domain: dict[str, str],
    index: int,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    locale = data["locale"]
    rounded_rect(canvas, x, y, width, height, 12, palette(data, "surface"), palette(data, "line"), 0.7)
    rounded_rect(canvas, x + 12, y + height - 34, 22, 22, 7, palette(data, "cobaltSoft"))
    canvas.setFillColor(palette(data, "cobalt"))
    canvas.setFont(BOLD_FONT, 7.5)
    canvas.drawCentredString(x + 23, y + height - 26.5, f"{index:02d}")
    draw_wrapped(
        canvas,
        domain["title"],
        x + 42,
        y + height - 20,
        width - 52,
        BOLD_FONT,
        9.0 if locale == "ko" else 8.6,
        11.4,
        palette(data, "ink"),
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        domain["description"],
        x + 12,
        y + height - 52,
        width - 24,
        REGULAR_FONT,
        7.35 if locale == "ko" else 7.05,
        10.2,
        palette(data, "muted"),
        locale,
        4,
    )
    canvas.setStrokeColor(palette(data, "line"))
    canvas.setLineWidth(0.55)
    canvas.line(x + 12, y + 25, x + width - 12, y + 25)
    draw_wrapped(
        canvas,
        domain["detail"],
        x + 12,
        y + 10,
        width - 24,
        BOLD_FONT,
        6.4,
        8,
        palette(data, "cobalt"),
        locale,
        1,
    )


def draw_page_two(canvas: Canvas, data: dict[str, Any]) -> None:
    locale = data["locale"]
    curriculum = data["copy"]["curriculum"]
    workflow = data["copy"]["workflow"]
    canvas.setFillColor(palette(data, "paper"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    draw_eyebrow(canvas, curriculum["eyebrow"], MARGIN, 800, palette(data, "cobalt"), 8.2)
    draw_wrapped(
        canvas,
        curriculum["title"],
        MARGIN,
        760,
        CONTENT_W,
        BOLD_FONT,
        23.5 if locale == "ko" else 21.5,
        29,
        palette(data, "ink"),
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        curriculum["description"],
        MARGIN,
        714,
        CONTENT_W,
        REGULAR_FONT,
        8.7,
        13,
        palette(data, "muted"),
        locale,
        2,
    )

    gap = 9
    card_w = (CONTENT_W - (gap * 2)) / 3
    card_h = 130
    for index, domain in enumerate(curriculum["domains"]):
        row = index // 3
        column = index % 3
        x = MARGIN + column * (card_w + gap)
        y = 533 - row * 140
        draw_domain_card(canvas, data, domain, index + 1, x, y, card_w, card_h)

    block_x, block_y, block_w, block_h = 28, 71, PAGE_W - 56, 287
    rounded_rect(canvas, block_x, block_y, block_w, block_h, 18, palette(data, "deepCobalt"))
    draw_eyebrow(canvas, workflow["eyebrow"], block_x + 22, block_y + block_h - 30, colors.white, 7.5)
    draw_wrapped(
        canvas,
        workflow["title"],
        block_x + 22,
        block_y + block_h - 58,
        block_w - 44,
        BOLD_FONT,
        17.5 if locale == "ko" else 16.5,
        22,
        colors.white,
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        workflow["description"],
        block_x + 22,
        block_y + block_h - 103,
        block_w - 44,
        REGULAR_FONT,
        7.9,
        11.6,
        Color(1, 1, 1, alpha=0.74),
        locale,
        2,
    )

    inner_x = block_x + 22
    steps_y = block_y + 61
    steps_gap = 6
    step_w = (block_w - 44 - steps_gap * 4) / 5
    step_h = 93
    for index, step in enumerate(workflow["steps"]):
        x = inner_x + index * (step_w + steps_gap)
        rounded_rect(canvas, x, steps_y, step_w, step_h, 10, Color(1, 1, 1, alpha=0.085), Color(1, 1, 1, alpha=0.18), 0.6)
        canvas.setFillColor(palette(data, "claySoft"))
        canvas.circle(x + 15, steps_y + step_h - 16, 8.5, stroke=0, fill=1)
        canvas.setFillColor(palette(data, "clay"))
        canvas.setFont(BOLD_FONT, 6.5)
        canvas.drawCentredString(x + 15, steps_y + step_h - 18.2, str(index + 1))
        draw_wrapped(
            canvas,
            step["title"],
            x + 9,
            steps_y + step_h - 37,
            step_w - 18,
            BOLD_FONT,
            8.2,
            10.2,
            colors.white,
            locale,
            2,
        )
        draw_wrapped(
            canvas,
            step["description"],
            x + 9,
            steps_y + 40,
            step_w - 18,
            REGULAR_FONT,
            6.7,
            9.1,
            Color(1, 1, 1, alpha=0.68),
            locale,
            4,
        )

    draw_wrapped(
        canvas,
        workflow["note"],
        block_x + 22,
        block_y + 34,
        block_w - 44,
        REGULAR_FONT,
        7.2,
        10,
        Color(1, 1, 1, alpha=0.68),
        locale,
        1,
    )
    draw_footer(canvas, data, 2)
    canvas.showPage()


def draw_photo_card(
    canvas: Canvas,
    data: dict[str, Any],
    item: dict[str, Any],
    image_path: Path,
    x: float,
    y: float,
    width: float,
    image_height: float,
) -> None:
    locale = data["locale"]
    caption_h = 40
    rounded_rect(canvas, x, y, width, image_height + caption_h, 13, palette(data, "surface"), palette(data, "line"), 0.7)
    draw_clipped_photo(canvas, image_path, x + 1, y + caption_h - 1, width - 2, image_height, 12)
    canvas.setFillColor(palette(data, "cobalt"))
    canvas.setFont(BOLD_FONT, 6.6)
    canvas.drawString(x + 11, y + 24, f"{item['order']:02d}")
    draw_wrapped(
        canvas,
        item["caption"],
        x + 32,
        y + 25,
        width - 43,
        BOLD_FONT,
        7.8 if locale == "ko" else 7.5,
        10.1,
        palette(data, "ink"),
        locale,
        2,
    )


def draw_page_three(canvas: Canvas, data: dict[str, Any], prepared: dict[str, Path]) -> None:
    locale = data["locale"]
    gallery_copy = data["copy"]["gallery"]
    canvas.setFillColor(palette(data, "paper"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    draw_eyebrow(canvas, gallery_copy["eyebrow"], MARGIN, 800, palette(data, "cobalt"), 8.2)
    draw_wrapped(
        canvas,
        gallery_copy["title"],
        MARGIN,
        760,
        CONTENT_W,
        BOLD_FONT,
        24 if locale == "ko" else 22,
        29,
        palette(data, "ink"),
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        gallery_copy["description"],
        MARGIN,
        714,
        CONTENT_W,
        REGULAR_FONT,
        8.4,
        12.4,
        palette(data, "muted"),
        locale,
        3,
    )

    gap = 9
    card_w = (CONTENT_W - gap * 2) / 3
    image_h = 177
    canvas.setFillColor(palette(data, "cobalt"))
    canvas.setFont(BOLD_FONT, 8.0)
    canvas.drawString(MARGIN, 665, "TRAINING / PRACTICE")
    canvas.setFillColor(palette(data, "muted"))
    canvas.setFont(REGULAR_FONT, 7.2)
    canvas.drawRightString(PAGE_W - MARGIN, 665, "01 — 03")
    for index, item in enumerate(data["gallery"][:3]):
        x = MARGIN + index * (card_w + gap)
        draw_photo_card(canvas, data, item, prepared[item["id"]], x, 424, card_w, image_h)

    canvas.setFillColor(palette(data, "clay"))
    canvas.setFont(BOLD_FONT, 8.0)
    canvas.drawString(MARGIN, 384, "VISITS / PARTNERSHIP DIALOGUE")
    canvas.setFillColor(palette(data, "muted"))
    canvas.setFont(REGULAR_FONT, 7.2)
    canvas.drawRightString(PAGE_W - MARGIN, 384, "04 — 06")
    for index, item in enumerate(data["gallery"][3:]):
        x = MARGIN + index * (card_w + gap)
        draw_photo_card(canvas, data, item, prepared[item["id"]], x, 143, card_w, image_h)

    draw_footer(canvas, data, 3)
    canvas.showPage()


def draw_page_four(canvas: Canvas, data: dict[str, Any]) -> None:
    locale = data["locale"]
    copy = data["copy"]
    completion = copy["completion"]
    contact = copy["contact"]
    canvas.setFillColor(palette(data, "paper"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    draw_eyebrow(canvas, completion["eyebrow"], MARGIN, 800, palette(data, "cobalt"), 8.2)
    draw_wrapped(
        canvas,
        completion["title"],
        MARGIN,
        760,
        CONTENT_W,
        BOLD_FONT,
        23 if locale == "ko" else 21,
        28,
        palette(data, "ink"),
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        completion["description"],
        MARGIN,
        710,
        CONTENT_W,
        REGULAR_FONT,
        8.7,
        13,
        palette(data, "muted"),
        locale,
        2,
    )

    rows_top = 678
    row_h = 43
    for index, item in enumerate(completion["items"]):
        y = rows_top - (index + 1) * row_h
        canvas.setStrokeColor(palette(data, "line"))
        canvas.setLineWidth(0.7)
        canvas.line(MARGIN, y, PAGE_W - MARGIN, y)
        canvas.setFillColor(palette(data, "cobalt"))
        canvas.setFont(BOLD_FONT, 7.8)
        canvas.drawString(MARGIN, y + 16, item["label"])
        draw_wrapped(
            canvas,
            item["value"],
            MARGIN + 108,
            y + 16,
            CONTENT_W - 108,
            REGULAR_FONT,
            8.5,
            11,
            palette(data, "ink"),
            locale,
            2,
        )
    canvas.line(MARGIN, rows_top, PAGE_W - MARGIN, rows_top)

    notice_y, notice_h = 464, 72
    rounded_rect(canvas, MARGIN, notice_y, CONTENT_W, notice_h, 13, palette(data, "claySoft"))
    canvas.setFillColor(palette(data, "clay"))
    canvas.setFont(BOLD_FONT, 9.1)
    canvas.drawString(MARGIN + 16, notice_y + notice_h - 24, completion["disclaimerTitle"])
    draw_wrapped(
        canvas,
        completion["disclaimer"],
        MARGIN + 16,
        notice_y + notice_h - 43,
        CONTENT_W - 32,
        REGULAR_FONT,
        7.8,
        11.1,
        palette(data, "ink"),
        locale,
        3,
    )

    block_x, block_y, block_w, block_h = 28, 71, PAGE_W - 56, 365
    rounded_rect(canvas, block_x, block_y, block_w, block_h, 18, palette(data, "cobalt"))
    draw_eyebrow(canvas, contact["eyebrow"], block_x + 22, block_y + block_h - 29, colors.white, 7.3)
    draw_wrapped(
        canvas,
        contact["title"],
        block_x + 22,
        block_y + block_h - 56,
        352,
        BOLD_FONT,
        16.8 if locale == "ko" else 15.8,
        21,
        colors.white,
        locale,
        2,
    )
    draw_wrapped(
        canvas,
        contact["description"],
        block_x + 22,
        block_y + block_h - 102,
        345,
        REGULAR_FONT,
        7.5,
        10.8,
        Color(1, 1, 1, alpha=0.74),
        locale,
        3,
    )

    badge_x = block_x + 22
    badge_y = block_y + 211
    for badge in contact["inquiryTypes"]:
        badge_w = string_width(badge, BOLD_FONT, 6.5) + 17
        rounded_rect(canvas, badge_x, badge_y, badge_w, 20, 10, Color(1, 1, 1, alpha=0.10), Color(1, 1, 1, alpha=0.22), 0.5)
        canvas.setFillColor(colors.white)
        canvas.setFont(BOLD_FONT, 6.5)
        canvas.drawCentredString(badge_x + badge_w / 2, badge_y + 7.1, badge)
        badge_x += badge_w + 5

    text_x = block_x + 22
    canvas.setFillColor(Color(1, 1, 1, alpha=0.64))
    canvas.setFont(BOLD_FONT, 6.5)
    canvas.drawString(text_x, block_y + 185, contact["emailLabel"])
    email = data["contact"]["email"]
    email_y = block_y + 168
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD_FONT, 9.2)
    canvas.drawString(text_x, email_y, email)
    mailto = f"mailto:{email}?subject={quote(contact['mailSubject'])}"
    canvas.linkURL(mailto, (text_x, email_y - 3, text_x + string_width(email, BOLD_FONT, 9.2), email_y + 11), relative=0, thickness=0)

    canvas.setFillColor(Color(1, 1, 1, alpha=0.64))
    canvas.setFont(BOLD_FONT, 6.5)
    canvas.drawString(text_x, block_y + 143, contact["schoolLabel"])
    draw_wrapped(canvas, contact["schoolAddress"], text_x, block_y + 128, 335, REGULAR_FONT, 7.1, 9.4, colors.white, locale, 2)
    canvas.setFillColor(Color(1, 1, 1, alpha=0.64))
    canvas.setFont(BOLD_FONT, 6.5)
    canvas.drawString(text_x, block_y + 98, contact["officeLabel"])
    draw_wrapped(canvas, contact["officeAddress"], text_x, block_y + 83, 335, REGULAR_FONT, 7.0, 9.3, colors.white, locale, 2)

    source_label = contact["sourceLabel"]
    source_y = block_y + 43
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD_FONT, 7.2)
    canvas.drawString(text_x, source_y, source_label)
    source_label_w = string_width(source_label, BOLD_FONT, 7.2)
    canvas.linkURL(data["sourceUrl"], (text_x, source_y - 3, text_x + source_label_w, source_y + 10), relative=0, thickness=0)
    canvas.setFillColor(Color(1, 1, 1, alpha=0.68))
    canvas.setFont(REGULAR_FONT, 6.0)
    canvas.drawString(text_x, source_y - 14, data["sourceUrl"])
    canvas.linkURL(data["sourceUrl"], (text_x, source_y - 17, text_x + 335, source_y - 4), relative=0, thickness=0)

    qr_size = 93
    qr_x = block_x + block_w - qr_size - 29
    qr_y = block_y + 139
    draw_qr(canvas, data["landingUrl"], qr_x, qr_y, qr_size, data)
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD_FONT, 6.8)
    canvas.drawCentredString(qr_x + qr_size / 2, qr_y - 18, "LANDING PAGE")
    canvas.setFillColor(Color(1, 1, 1, alpha=0.70))
    canvas.setFont(REGULAR_FONT, 5.7)
    landing_display = data["landingUrl"].replace("https://", "")
    canvas.drawCentredString(qr_x + qr_size / 2, qr_y - 31, landing_display)
    canvas.linkURL(data["landingUrl"], (qr_x - 7, qr_y - 35, qr_x + qr_size + 7, qr_y - 10), relative=0, thickness=0)

    canvas.setFillColor(palette(data, "muted"))
    canvas.setFont(REGULAR_FONT, 6.6)
    draw_wrapped(
        canvas,
        copy["footer"]["sourceNote"],
        MARGIN,
        55,
        CONTENT_W,
        REGULAR_FONT,
        6.6,
        8,
        palette(data, "muted"),
        locale,
        1,
    )
    draw_footer(canvas, data, 4)
    canvas.showPage()


def generate(locale: str, font_paths: tuple[Path, Path]) -> Path:
    data = load_catalog_data(locale)
    asset_root = TMP_ROOT / f"kts-caregiver-catalog-{locale}-assets"
    hero_source = REPO_ROOT / data["hero"]["imageFile"]
    prepared: dict[str, Path] = {
        "hero": prepare_photo(hero_source, asset_root / "hero.jpg", 1800, 1005, data["hero"]["objectPosition"])
    }
    for item in data["gallery"]:
        prepared[item["id"]] = prepare_photo(
            REPO_ROOT / item["imageFile"],
            asset_root / f"{item['order']:02d}-{item['id']}.jpg",
            800,
            860,
            item["objectPosition"],
        )

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_ROOT / f"kts-caregiver-catalog-{locale}-v1.pdf"
    public_path = PUBLIC_ROOT / output_path.name
    canvas = Canvas(
        str(output_path),
        pagesize=A4,
        pageCompression=1,
        invariant=1,
        pdfVersion=(1, 4),
        enforceColorSpace="RGB",
    )
    canvas.setTitle(data["metadata"]["title"])
    canvas.setAuthor(data["contact"]["legalName"]["ko"])
    canvas.setSubject(data["metadata"]["description"])
    canvas.setCreator("KTS caregiver catalog generator · ReportLab")
    canvas.setKeywords("KTS, Caregiver, Aged Care, Kathmandu, Nepal, JOONG WOO HRD")

    draw_page_one(canvas, data, prepared)
    draw_page_two(canvas, data)
    draw_page_three(canvas, data, prepared)
    draw_page_four(canvas, data)
    canvas.save()

    shutil.copyfile(output_path, public_path)
    print(f"generated {output_path.relative_to(REPO_ROOT)}")
    print(f"deployed  {public_path.relative_to(REPO_ROOT)}")
    print(f"fonts     {font_paths[0]} · {font_paths[1]}")
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locale", choices=("ko", "ja", "all"), default="all")
    args = parser.parse_args()
    fonts = register_fonts()
    locales = ("ko", "ja") if args.locale == "all" else (args.locale,)
    for locale in locales:
        generate(locale, fonts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
