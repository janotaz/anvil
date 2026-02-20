import type { DetectionResult } from "../detector/types.js";
import { generateClaudeMd } from "./claude-md.js";
import { generateMcpConfig, generateMcpConfigObject } from "./mcp-config.js";
import { generateHooksConfigObject } from "./hooks.js";
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
 *
 * When `local` is true, MCP config and hooks are merged into a single
 * `.claude/settings.local.json` file to avoid one overwriting the other.
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

  const mcpConfigObj = generateMcpConfigObject(detection);
  const hooksConfigObj = generateHooksConfigObject(detection);

  if (options.local) {
    // Merge MCP config and hooks into a single settings.local.json
    const merged: Record<string, unknown> = {};
    if (mcpConfigObj !== null) {
      merged["mcpServers"] = mcpConfigObj;
    }
    if (hooksConfigObj !== null) {
      merged["hooks"] = hooksConfigObj;
    }
    if (Object.keys(merged).length > 0) {
      files.push({
        relativePath: ".claude/settings.local.json",
        content: JSON.stringify(merged, null, 2) + "\n",
      });
    }
  } else {
    // MCP config goes to .mcp.json
    if (mcpConfigObj !== null) {
      const mcpConfig = generateMcpConfig(detection);
      if (mcpConfig !== null) {
        files.push({
          relativePath: ".mcp.json",
          content: mcpConfig,
        });
      }
    }

    // Hooks go to .claude/settings.local.json
    if (hooksConfigObj !== null) {
      files.push({
        relativePath: ".claude/settings.local.json",
        content: JSON.stringify({ hooks: hooksConfigObj }, null, 2) + "\n",
      });
    }
  }

  const slashCommands = generateSlashCommands(detection);
  files.push(...slashCommands);

  return files;
}
