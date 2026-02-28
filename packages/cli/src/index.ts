#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runAdd } from "./commands/add.js";
import { runBuild } from "./commands/build.js";
import { runServe } from "./commands/serve.js";
import { runExport } from "./commands/export.js";

const program = new Command();

program
  .name("pocketmoon")
  .description("Pocket Moon flipbook studio CLI")
  .version("1.0.0");

program.command("init").description("Initialize Pocket Moon config and folders").action(runInit);
program.command("add").argument("<path>").description("Add files or folders to pocketmoon/input").action(runAdd);
program.command("build").description("Build normalized pages, thumbnails, and manifest").action(runBuild);
program.command("serve").description("Build if needed and run viewer in dev mode").action(runServe);
program.command("export").description("Build and export static viewer").action(runExport);

program.parseAsync(process.argv).catch((error) => {
  console.error(`\n[pocketmoon] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});