import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG, type PocketMoonConfig } from "@pocketmoon/shared";

export const CONFIG_FILE = "pocketmoon.config.json";

export async function readConfig(cwd = process.cwd()): Promise<PocketMoonConfig> {
  const file = path.resolve(cwd, CONFIG_FILE);
  try {
    const raw = await fs.readFile(file, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as PocketMoonConfig;
  } catch (error) {
    throw new Error(`Missing config. Run \"pocketmoon init\" in ${cwd}.`);
  }
}

export async function writeDefaultConfig(cwd = process.cwd()): Promise<void> {
  const file = path.resolve(cwd, CONFIG_FILE);
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, "utf8");
  }
}

export function resolveDirs(config: PocketMoonConfig, cwd = process.cwd()): {
  inputDir: string;
  outputDir: string;
  exportDir: string;
} {
  return {
    inputDir: path.resolve(cwd, config.inputDir),
    outputDir: path.resolve(cwd, config.outputDir),
    exportDir: path.resolve(cwd, config.exportDir)
  };
}