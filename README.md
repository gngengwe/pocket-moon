# Pocket Moon

Pocket Moon is a light-theme flipbook studio that ingests PDFs and images, normalizes them into page frames, and publishes a smooth animated web viewer.

## Supported Inputs

- `.pdf`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

## Quickstart

```bash
npm install
npm run pocketmoon:init
npx pocketmoon serve
```

If `pocketmoon` is available on your PATH after install, you can run:

```bash
pocketmoon serve
```

## Workspace Layout

```text
pocket-moon/
  apps/viewer        # Next.js App Router viewer
  packages/cli       # pocketmoon CLI
  packages/shared    # shared types/utils
  demo/input         # generated demo source assets
  demo/output        # default generated output location
```

## CLI Commands

### `pocketmoon init`

- Creates `pocketmoon.config.json` if missing
- Creates `./pocketmoon/input` and `./pocketmoon/output`
- Copies `./demo/input` into `./pocketmoon/input` if empty

### `pocketmoon add <path>`

Examples:

```bash
pocketmoon add ./my-pages
pocketmoon add ./cover.jpg
```

- Copies supported files into `./pocketmoon/input`
- Folder input is recursive
- Files are processed with natural filename sorting

### `pocketmoon build`

Produces:

- `./pocketmoon/output/pages`
- `./pocketmoon/output/thumbs`
- `./pocketmoon/output/manifest.json`
- `./pocketmoon/output/.cache.json`

### `pocketmoon serve`

- Builds first if output is missing/stale
- Syncs manifest and assets into `apps/viewer/public`
- Starts Next.js dev server
- Opens browser at `http://localhost:3000`

### `pocketmoon export`

- Runs build
- Copies output assets into viewer `public/`
- Runs static export
- Writes deployable files into `./pocketmoon/export`

## Caching

`pocketmoon build` fingerprints each input (size + mtime + content hash) and stores derived artifact metadata in `./pocketmoon/output/.cache.json`.

When inputs and frame settings are unchanged, it reuses cached normalized page images and thumbnails from `./pocketmoon/output/.cache-assets` instead of re-rendering.

## Static Deploy

After:

```bash
pocketmoon export
```

Deploy `./pocketmoon/export` to any static host:

- Netlify: publish directory `pocketmoon/export`
- Vercel static: upload `pocketmoon/export`
- GitHub Pages: push contents of `pocketmoon/export`
- S3 + CloudFront: sync `pocketmoon/export`

## Config

Generated `pocketmoon.config.json`:

```json
{
  "inputDir": "./pocketmoon/input",
  "outputDir": "./pocketmoon/output",
  "exportDir": "./pocketmoon/export",
  "frame": { "width": 1080, "height": 1440, "background": "#ffffff" },
  "thumbnail": { "longEdge": 240 },
  "transitions": { "default": "drift", "available": ["fade", "slide", "flip", "drift"] },
  "demoMode": true
}
```

## Build + Dev Scripts

Root scripts:

- `npm run dev`
- `npm run build`
- `npm run pocketmoon:init`
- `npm run pocketmoon:add -- <path>`
- `npm run pocketmoon:build`
- `npm run pocketmoon:serve`
- `npm run pocketmoon:export`

## Troubleshooting

### PDF rendering dependencies

This project uses `pdfjs-dist` + `@napi-rs/canvas` and `sharp`.

- Windows/macOS/Linux usually work with prebuilt binaries.
- If install fails, update Node.js to current LTS and run:

```bash
npm rebuild sharp @napi-rs/canvas
```

- On Linux, install basic system libs if required by native packages (`libc`, build essentials).

### No pages in viewer

Run:

```bash
pocketmoon init
pocketmoon build
```

Then start viewer again.