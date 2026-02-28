import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import open from "open";
import { readConfig, resolveDirs } from "../lib/config.js";
import { listSupportedFiles } from "../lib/fs-utils.js";
import { runBuild } from "./build.js";

async function outputIsStale(inputDir: string, outputDir: string): Promise<boolean> {
  const manifest = path.join(outputDir, "manifest.json");
  const manifestStat = await fs.stat(manifest).catch(() => null);
  if (!manifestStat) {
    return true;
  }

  const files = await listSupportedFiles(inputDir);
  for (const rel of files) {
    const stat = await fs.stat(path.join(inputDir, rel));
    if (stat.mtimeMs > manifestStat.mtimeMs) {
      return true;
    }
  }
  return false;
}

export async function runServe(): Promise<void> {
  const cwd = process.cwd();
  const config = await readConfig(cwd);
  const { inputDir, outputDir } = resolveDirs(config, cwd);

  if (await outputIsStale(inputDir, outputDir)) {
    console.log("[serve] Output missing or stale. Running build first...");
    await runBuild();
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  const viewerDir = path.resolve(cwd, "apps", "viewer");
  console.log(`[serve] Starting viewer from ${viewerDir}`);

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev", "--workspace", "@pocketmoon/viewer"], {
    // Prefer direct process invocation over shell concatenation.
    // This avoids quoting edge cases and deprecation warnings.
    cwd,
    env: {
      ...process.env,
      POCKETMOON_MANIFEST_PATH: manifestPath,
      POCKETMOON_OUTPUT_DIR: outputDir
    },
    stdio: "inherit",
    shell: false
  });

  setTimeout(() => {
    void open("http://localhost:3000").catch(() => undefined);
  }, 1200);

  await new Promise<void>((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Viewer exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}
