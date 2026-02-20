#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { doctorCommand } from "./commands/doctor.js";

const program = new Command();

program
  .name("anvil")
  .description("A scaffolder for Claude Code. Generates tailored configuration for your project.")
  .version("0.1.0");

program
  .command("init")
  .description("Detect project characteristics and generate Claude Code configuration")
  .option("--local", "Write MCP config to .claude/settings.local.json instead of .mcp.json")
  .option("--dry-run", "Show what would be generated without writing files")
  .option("--force", "Overwrite existing files without prompting")
  .option("--path <path>", "Project path to analyze (defaults to current directory)")
  .action(initCommand);

program
  .command("doctor")
  .description("Validate existing Claude Code configuration")
  .option("--path <path>", "Project path to check (defaults to current directory)")
  .action(doctorCommand);

program.parse();
