# Official brand source

`logo.ai` is the PDF-compatible Illustrator source supplied in the official
`JW HRDI-최종시안` logo package. It was copied byte-for-byte into this repository;
macOS may display the original Korean path using decomposed Unicode.

- SHA-256: `03d31c21877613ffd0d388436af4ad23bc319c199f44f60a03c4b27b8c65366e`
- Exporter: `scripts/export-brand-assets.mjs`
- Raster dependency: `sharp` 0.34.5, installed through `npm ci`
- System prerequisite: Poppler's `pdfinfo` and `pdftocairo` commands on `PATH`
- Tested Poppler command version: `pdftocairo 26.07.0`

From `company/`, regenerate the committed assets with:

```sh
node scripts/export-brand-assets.mjs
```

The exporter verifies the source checksum before invoking Poppler. It writes to
the company root by default. For a clean comparison without touching committed
files, pass an existing or new absolute temporary directory:

```sh
node scripts/export-brand-assets.mjs --output-root /absolute/path/to/temporary-root
```

An alternate absolute source path may be supplied as the final positional
argument, but it must have the same approved SHA-256 checksum.
