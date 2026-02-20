import type { DetectionResult } from "../detector/types.js";

interface HookEntry {
  matcher: string;
  type: "command";
  command: string;
}

interface HooksConfig {
  hooks: {
    PostToolUse?: HookEntry[];
    PreToolUse?: HookEntry[];
  };
}

/**
 * Generate hooks configuration as a plain object.
 *
 * Returns the hooks record, or null if no hooks apply.
 * Used by the generation orchestrator for merging with MCP config.
 */
export function generateHooksConfigObject(
  detection: DetectionResult,
): HooksConfig["hooks"] | null {
  const hooks: HooksConfig["hooks"] = {};
  const postToolUse: HookEntry[] = [];

  // Auto-format after Claude edits files
  const formatter = getFormatterCommand(detection);
  if (formatter !== null) {
    postToolUse.push({
      matcher: "Write|Edit",
      type: "command",
      command: formatter,
    });
  }

  if (postToolUse.length > 0) {
    hooks.PostToolUse = postToolUse;
  }

  // Only return if we have at least one hook
  if (Object.keys(hooks).length === 0) {
    return null;
  }

  return hooks;
}

/**
 * Generate Claude Code hooks configuration based on detected project tools.
 *
 * Returns a JSON string for .claude/settings.local.json, or null if no hooks apply.
 */
export function generateHooksConfig(detection: DetectionResult): string | null {
  const hooks = generateHooksConfigObject(detection);
  if (hooks === null) return null;

  return JSON.stringify({ hooks }, null, 2) + "\n";
}

/**
 * Determine the appropriate formatter command for post-edit hooks.
 */
function getFormatterCommand(detection: DetectionResult): string | null {
  const linterNames = detection.linters.map((l) => l.name);

  if (linterNames.includes("biome")) {
    return "npx biome format --write \"$CLAUDE_FILE_PATH\"";
  }

  if (linterNames.includes("prettier")) {
    return "npx prettier --write \"$CLAUDE_FILE_PATH\"";
  }

  if (linterNames.includes("black")) {
    return "black \"$CLAUDE_FILE_PATH\"";
  }

  if (linterNames.includes("ruff")) {
    return "ruff format \"$CLAUDE_FILE_PATH\"";
  }

  return null;
}
