import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { naturalSort, supportedExtensions } from "@pocketmoon/shared";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function directoryIsEmpty(dir: string): Promise<boolean> {
  try {
    const items = await fs.readdir(dir);
    return items.length === 0;
  } catch {
    return true;
  }
}

export async function copyTree(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fg("**/*", { cwd: src, onlyFiles: true, dot: false });
  for (const rel of entries.sort(naturalSort)) {
    const from = path.join(src, rel);
    const to = path.join(dest, rel);
    await ensureDir(path.dirname(to));
    await fs.copyFile(from, to);
  }
}

export async function listSupportedFiles(baseDir: string): Promise<string[]> {
  const patterns = supportedExtensions.map((ext) => `**/*${ext}`);
  const files = await fg(patterns, {
    cwd: baseDir,
    onlyFiles: true,
    caseSensitiveMatch: false,
    dot: false
  });
  return files.sort(naturalSort);
}

export function isSupported(filePath: string): boolean {
  return supportedExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}

export function isImage(filePath: string): boolean {
  return [".png", ".jpg", ".jpeg", ".webp"].some((ext) => filePath.toLowerCase().endsWith(ext));
}