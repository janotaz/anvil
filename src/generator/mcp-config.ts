import type { DetectionResult } from "../detector/types.js";

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Generate MCP server configuration based on detected project characteristics.
 *
 * Returns a JSON string for .mcp.json, or null if no servers are relevant.
 */
export function generateMcpConfig(detection: DetectionResult): string | null {
  const servers: Record<string, McpServerConfig> = {};

  // Memory: always configured (cross-session memory is universally useful)
  servers["memory"] = {
    command: "python",
    args: ["-m", "mcp_memory_service"],
  };

  // Codebase intelligence: depends on language
  if (
    detection.languages.includes("typescript") ||
    detection.languages.includes("javascript")
  ) {
    servers["lsp"] = {
      command: "npx",
      args: ["-y", "@mizchi/lsmcp", "-p", "tsgo"],
    };
  } else if (detection.languages.includes("python")) {
    servers["tree-sitter"] = {
      command: "python",
      args: ["-m", "mcp_server_tree_sitter"],
    };
  }

  // GitHub: only if .github/ directory exists
  if (detection.ciProvider === "github-actions") {
    servers["github"] = {
      command: "npx",
      args: ["-y", "@anthropic/github-mcp-server"],
      env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
    };
  }

  // Coverage: only if test framework detected
  if (detection.testFramework !== null) {
    servers["coverage"] = {
      command: "npx",
      args: ["-y", "test-coverage-mcp"],
    };
  }

  if (Object.keys(servers).length === 0) {
    return null;
  }

  const config = { mcpServers: servers };
  return JSON.stringify(config, null, 2) + "\n";
}
