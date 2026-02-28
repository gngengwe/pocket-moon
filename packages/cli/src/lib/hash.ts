import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";

export async function fileFingerprint(filePath: string): Promise<string> {
  const stats = await fs.stat(filePath);
  const data = await fs.readFile(filePath);
  const hash = createHash("sha256").update(data).digest("hex");
  return `${stats.size}:${stats.mtimeMs}:${hash}`;
}