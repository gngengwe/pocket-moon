import { promises as fs } from "node:fs";
import path from "node:path";
import { writeDefaultConfig, readConfig, resolveDirs } from "../lib/config.js";
import { copyTree, directoryIsEmpty, ensureDir } from "../lib/fs-utils.js";

export async function runInit(): Promise<void> {
  const cwd = process.cwd();
  await writeDefaultConfig(cwd);
  const config = await readConfig(cwd);
  const { inputDir, outputDir } = resolveDirs(config, cwd);

  await ensureDir(inputDir);
  await ensureDir(outputDir);

  const localPocketMoon = path.join(cwd, "pocketmoon");
  await ensureDir(localPocketMoon);

  const inputEmpty = await directoryIsEmpty(inputDir);
  if (inputEmpty) {
    const demoInput = path.resolve(cwd, "demo", "input");
    try {
      await fs.access(demoInput);
      await copyTree(demoInput, inputDir);
      console.log(`[init] Copied demo assets to ${inputDir}`);
    } catch {
      console.log(`[init] Demo assets not found at ${demoInput}. Skipping copy.`);
    }
  } else {
    console.log(`[init] Input already contains files. Leaving existing content untouched.`);
  }

  console.log(`[init] Ready. Config: ${path.join(cwd, "pocketmoon.config.json")}`);
}