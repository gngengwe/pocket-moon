import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const publicDir = path.join(cwd, "public");
const manifest = process.env.POCKETMOON_MANIFEST_PATH;
const outputDir = process.env.POCKETMOON_OUTPUT_DIR;

await mkdir(publicDir, { recursive: true });

if (manifest && outputDir) {
  await cp(path.resolve(manifest), path.join(publicDir, "manifest.json"), { force: true });
  await cp(path.resolve(outputDir, "pages"), path.join(publicDir, "pages"), { recursive: true, force: true });
  await cp(path.resolve(outputDir, "thumbs"), path.join(publicDir, "thumbs"), { recursive: true, force: true });
  console.log(`[viewer] Synced assets from ${outputDir}`);
}