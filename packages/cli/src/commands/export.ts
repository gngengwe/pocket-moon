import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { readConfig, resolveDirs } from "../lib/config.js";
import { ensureDir } from "../lib/fs-utils.js";
import { runBuild } from "./build.js";

async function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(" ")} (${code})`));
      }
    });
    child.on("error", reject);
  });
}

export async function runExport(): Promise<void> {
  const cwd = process.cwd();
  const config = await readConfig(cwd);
  const { outputDir, exportDir } = resolveDirs(config, cwd);

  await runBuild();

  const viewerPublic = path.resolve(cwd, "apps", "viewer", "public");
  await ensureDir(viewerPublic);
  await fs.cp(path.join(outputDir, "manifest.json"), path.join(viewerPublic, "manifest.json"), { force: true });
  await fs.cp(path.join(outputDir, "pages"), path.join(viewerPublic, "pages"), { recursive: true, force: true });
  await fs.cp(path.join(outputDir, "thumbs"), path.join(viewerPublic, "thumbs"), { recursive: true, force: true });

  const env = {
    ...process.env,
    NEXT_PUBLIC_POCKETMOON_STATIC: "true"
  };

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(npmCmd, ["run", "build", "--workspace", "@pocketmoon/viewer"], cwd, env);

  const viewerOut = path.resolve(cwd, "apps", "viewer", "out");
  await fs.rm(exportDir, { recursive: true, force: true });
  await ensureDir(path.dirname(exportDir));
  await fs.cp(viewerOut, exportDir, { recursive: true, force: true });

  console.log(`[export] Static export is ready at ${exportDir}`);
}
