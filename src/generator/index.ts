import type { DetectionResult } from "../detector/types.js";
import { generateClaudeMd } from "./claude-md.js";
import { generateMcpConfig } from "./mcp-config.js";
import { generateHooksConfig } from "./hooks.js";
import { generateSlashCommands } from "./slash-commands.js";

/** A file to be written to disk. */
export interface GeneratedFile {
  /** Relative path from the project root (e.g., "CLAUDE.md", ".mcp.json"). */
  relativePath: string;
  /** File content. */
  content: string;
}

/** Options for the generation step. */
export interface GenerateOptions {
  /** Write MCP config to .claude/settings.local.json instead of .mcp.json. */
  local: boolean;
}

/**
 * Generate all output files from a detection result.
 *
 * Returns an array of files to be written. The caller decides whether
 * to actually write them (supports --dry-run).
 */
export function generateAll(
  detection: DetectionResult,
  options: GenerateOptions,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    relativePath: "CLAUDE.md",
    content: generateClaudeMd(detection),
  });

  const mcpConfig = generateMcpConfig(detection);
  if (mcpConfig !== null) {
    files.push({
      relativePath: options.local ? ".claude/settings.local.json" : ".mcp.json",
      content: mcpConfig,
    });
  }

  const hooks = generateHooksConfig(detection);
  if (hooks !== null) {
    files.push({
      relativePath: ".claude/settings.local.json",
      content: hooks,
    });
  }

  const slashCommands = generateSlashCommands(detection);
  files.push(...slashCommands);

  return files;
}
