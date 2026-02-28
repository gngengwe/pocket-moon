import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { naturalSort } from "@pocketmoon/shared";
import { readConfig, resolveDirs } from "../lib/config.js";
import { ensureDir, isSupported } from "../lib/fs-utils.js";

export async function runAdd(targetPath: string): Promise<void> {
  const cwd = process.cwd();
  const config = await readConfig(cwd);
  const { inputDir } = resolveDirs(config, cwd);
  const resolvedTarget = path.resolve(cwd, targetPath);

  await ensureDir(inputDir);

  let stats;
  try {
    stats = await fs.stat(resolvedTarget);
  } catch {
    throw new Error(`Path not found: ${targetPath}`);
  }

  const sourceFiles: string[] = [];
  if (stats.isDirectory()) {
    const files = await fg("**/*", { cwd: resolvedTarget, onlyFiles: true, dot: false });
    for (const rel of files.sort(naturalSort)) {
      const absolute = path.join(resolvedTarget, rel);
      if (isSupported(absolute)) {
        sourceFiles.push(absolute);
      }
    }
  } else if (stats.isFile() && isSupported(resolvedTarget)) {
    sourceFiles.push(resolvedTarget);
  }

  if (!sourceFiles.length) {
    throw new Error("No supported files found. Supported: .pdf .png .jpg .jpeg .webp");
  }

  for (const source of sourceFiles) {
    const base = path.basename(source);
    let destination = path.join(inputDir, base);
    let suffix = 1;
    while (await fs.access(destination).then(() => true).catch(() => false)) {
      const ext = path.extname(base);
      const stem = path.basename(base, ext);
      destination = path.join(inputDir, `${stem}_${suffix}${ext}`);
      suffix += 1;
    }
    await fs.copyFile(source, destination);
    console.log(`[add] ${source} -> ${destination}`);
  }

  console.log(`[add] Added ${sourceFiles.length} file(s).`);
}