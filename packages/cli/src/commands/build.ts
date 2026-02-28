import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  padPageId,
  type PocketMoonManifest,
  type ManifestPage
} from "@pocketmoon/shared";
import { readConfig, resolveDirs } from "../lib/config.js";
import { ensureDir, isImage, listSupportedFiles } from "../lib/fs-utils.js";
import { fileFingerprint } from "../lib/hash.js";
import { renderPdfPages } from "../lib/pdf.js";

interface CachePageEntry {
  index: number;
  pageCacheFile: string;
  thumbCacheFile: string;
}

interface CacheEntry {
  fingerprint: string;
  kind: "pdf" | "image";
  frameKey: string;
  thumbEdge: number;
  pageCount: number;
  pages: CachePageEntry[];
}

interface BuildCache {
  version: 1;
  entries: Record<string, CacheEntry>;
}

const CACHE_NAME = ".cache.json";

async function readCache(cacheFile: string): Promise<BuildCache> {
  try {
    const parsed = JSON.parse(await fs.readFile(cacheFile, "utf8")) as BuildCache;
    if (parsed.version === 1 && parsed.entries) {
      return parsed;
    }
  } catch {
    // ignore and start fresh
  }
  return { version: 1, entries: {} };
}

async function cacheArtifactsExist(baseDir: string, pages: CachePageEntry[]): Promise<boolean> {
  for (const item of pages) {
    const pageOk = await fs
      .access(path.join(baseDir, item.pageCacheFile))
      .then(() => true)
      .catch(() => false);
    const thumbOk = await fs
      .access(path.join(baseDir, item.thumbCacheFile))
      .then(() => true)
      .catch(() => false);
    if (!pageOk || !thumbOk) {
      return false;
    }
  }
  return true;
}

function longEdgeResize(width: number, height: number, edge: number): { width: number; height: number } {
  if (width >= height) {
    return { width: edge, height: Math.max(1, Math.round((height / width) * edge)) };
  }
  return { width: Math.max(1, Math.round((width / height) * edge)), height: edge };
}

async function normalizeIntoFrame(sourceBuffer: Buffer, targetFile: string, frame: { width: number; height: number; background: string }): Promise<void> {
  await sharp(sourceBuffer)
    .rotate()
    .resize(frame.width, frame.height, { fit: "contain", background: frame.background })
    .png()
    .toFile(targetFile);
}

async function makeThumb(normalizedPageFile: string, targetFile: string, longEdge: number): Promise<{ width: number; height: number }> {
  const meta = await sharp(normalizedPageFile).metadata();
  const sourceW = meta.width ?? longEdge;
  const sourceH = meta.height ?? longEdge;
  const resized = longEdgeResize(sourceW, sourceH, longEdge);
  await sharp(normalizedPageFile).resize(resized.width, resized.height).png().toFile(targetFile);
  return resized;
}

export async function runBuild(): Promise<void> {
  const cwd = process.cwd();
  const config = await readConfig(cwd);
  const { inputDir, outputDir } = resolveDirs(config, cwd);

  await ensureDir(inputDir);
  await ensureDir(outputDir);

  const pagesDir = path.join(outputDir, "pages");
  const thumbsDir = path.join(outputDir, "thumbs");
  const cacheArtifactsDir = path.join(outputDir, ".cache-assets");
  const cachePagesDir = path.join(cacheArtifactsDir, "pages");
  const cacheThumbsDir = path.join(cacheArtifactsDir, "thumbs");
  await Promise.all([ensureDir(pagesDir), ensureDir(thumbsDir), ensureDir(cachePagesDir), ensureDir(cacheThumbsDir)]);

  const cacheFile = path.join(outputDir, CACHE_NAME);
  const cache = await readCache(cacheFile);
  const frameKey = `${config.frame.width}x${config.frame.height}:${config.frame.background}`;

  const files = await listSupportedFiles(inputDir);
  if (!files.length) {
    throw new Error(`No supported files found in ${inputDir}. Use \"pocketmoon add <path>\".`);
  }

  const usedPageOutputs = new Set<string>();
  const usedThumbOutputs = new Set<string>();
  const pages: ManifestPage[] = [];

  let pageOrder = 0;
  for (const relativeInput of files) {
    const absoluteInput = path.join(inputDir, relativeInput);
    const fingerprint = await fileFingerprint(absoluteInput);
    const kind: "pdf" | "image" = isImage(relativeInput) ? "image" : "pdf";

    let cacheEntry = cache.entries[relativeInput];
    const canReuse = Boolean(
      cacheEntry &&
        cacheEntry.fingerprint === fingerprint &&
        cacheEntry.kind === kind &&
        cacheEntry.frameKey === frameKey &&
        cacheEntry.thumbEdge === config.thumbnail.longEdge &&
        (await cacheArtifactsExist(cacheArtifactsDir, cacheEntry.pages))
    );

    let pageArtifacts: CachePageEntry[] = [];

    if (canReuse) {
      pageArtifacts = cacheEntry.pages;
      console.log(`[build] Reusing cache: ${relativeInput}`);
    } else {
      console.log(`[build] Processing: ${relativeInput}`);
      pageArtifacts = [];

      if (kind === "image") {
        const source = await fs.readFile(absoluteInput);
        const pageCacheFile = path.join("pages", `${Buffer.from(relativeInput).toString("hex")}-1.png`);
        const thumbCacheFile = path.join("thumbs", `${Buffer.from(relativeInput).toString("hex")}-1.png`);
        const pageTarget = path.join(cacheArtifactsDir, pageCacheFile);
        const thumbTarget = path.join(cacheArtifactsDir, thumbCacheFile);

        await normalizeIntoFrame(source, pageTarget, config.frame);
        await makeThumb(pageTarget, thumbTarget, config.thumbnail.longEdge);
        pageArtifacts.push({ index: 1, pageCacheFile, thumbCacheFile });
      } else {
        const pdfBuffer = await fs.readFile(absoluteInput);
        const rendered = await renderPdfPages(new Uint8Array(pdfBuffer));
        for (const renderedPage of rendered) {
          const pageCacheFile = path.join("pages", `${Buffer.from(relativeInput).toString("hex")}-${renderedPage.pageNumber}.png`);
          const thumbCacheFile = path.join("thumbs", `${Buffer.from(relativeInput).toString("hex")}-${renderedPage.pageNumber}.png`);
          const pageTarget = path.join(cacheArtifactsDir, pageCacheFile);
          const thumbTarget = path.join(cacheArtifactsDir, thumbCacheFile);
          await normalizeIntoFrame(renderedPage.png, pageTarget, config.frame);
          await makeThumb(pageTarget, thumbTarget, config.thumbnail.longEdge);
          pageArtifacts.push({ index: renderedPage.pageNumber, pageCacheFile, thumbCacheFile });
        }
      }

      cacheEntry = {
        fingerprint,
        kind,
        frameKey,
        thumbEdge: config.thumbnail.longEdge,
        pageCount: pageArtifacts.length,
        pages: pageArtifacts
      };
      cache.entries[relativeInput] = cacheEntry;
    }

    for (const artifact of pageArtifacts) {
      pageOrder += 1;
      const pageId = padPageId(pageOrder);
      const pageFile = path.join(pagesDir, `${pageId}.png`);
      const thumbFile = path.join(thumbsDir, `${pageId}.png`);

      await fs.copyFile(path.join(cacheArtifactsDir, artifact.pageCacheFile), pageFile);
      await fs.copyFile(path.join(cacheArtifactsDir, artifact.thumbCacheFile), thumbFile);
      usedPageOutputs.add(`${pageId}.png`);
      usedThumbOutputs.add(`${pageId}.png`);

      pages.push({
        id: pageId,
        order: pageOrder,
        type: "image",
        source: {
          kind,
          file: path.basename(relativeInput),
          page: kind === "pdf" ? artifact.index : null
        },
        image: {
          src: `pages/${pageId}.png`,
          width: config.frame.width,
          height: config.frame.height
        },
        thumb: {
          src: `thumbs/${pageId}.png`,
          width: Math.round((config.frame.width / config.frame.height) * config.thumbnail.longEdge),
          height: config.thumbnail.longEdge
        },
        meta: {}
      });
    }
  }

  const existingPages = await fs.readdir(pagesDir);
  for (const file of existingPages) {
    if (!usedPageOutputs.has(file)) {
      await fs.rm(path.join(pagesDir, file), { force: true });
    }
  }
  const existingThumbs = await fs.readdir(thumbsDir);
  for (const file of existingThumbs) {
    if (!usedThumbOutputs.has(file)) {
      await fs.rm(path.join(thumbsDir, file), { force: true });
    }
  }

  const captions: Record<string, string> = {};
  for (const page of pages) {
    captions[page.id] = `Pocket Moon demo: page ${page.order}`;
  }

  const manifest: PocketMoonManifest = {
    version: 1,
    title: "Pocket Moon",
    generatedAt: new Date().toISOString(),
    frame: {
      width: config.frame.width,
      height: config.frame.height,
      background: config.frame.background
    },
    pages,
    demo: {
      mode: config.demoMode,
      captions
    }
  };

  await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(cacheFile, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

  console.log(`[build] Wrote ${pages.length} pages -> ${outputDir}`);
}
