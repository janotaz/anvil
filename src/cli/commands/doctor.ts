import * as fs from "node:fs";
import * as path from "node:path";

interface DoctorOptions {
  path?: string;
}

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
}

/**
 * Handler for the `anvil doctor` command.
 *
 * Validates existing Claude Code configuration and reports issues.
 */
export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const projectPath = path.resolve(options.path ?? process.cwd());

  // eslint-disable-next-line no-console
  console.log(`Checking configuration at ${projectPath}...\n`);

  const checks: CheckResult[] = [];

  checks.push(await checkFileExists(projectPath, "CLAUDE.md"));
  checks.push(await checkMcpConfig(projectPath));
  checks.push(await checkHooksConfig(projectPath));
  checks.push(await checkSlashCommands(projectPath));

  printResults(checks);
}

async function checkFileExists(
  projectPath: string,
  fileName: string,
): Promise<CheckResult> {
  try {
    await fs.promises.access(path.join(projectPath, fileName));
    return { name: fileName, status: "ok", message: "Found" };
  } catch {
    return { name: fileName, status: "error", message: "Not found" };
  }
}

async function checkMcpConfig(projectPath: string): Promise<CheckResult> {
  const mcpJsonPath = path.join(projectPath, ".mcp.json");
  const localPath = path.join(projectPath, ".claude", "settings.local.json");

  try {
    const mcpContent = await tryReadJson(mcpJsonPath);
    if (mcpContent !== null) {
      const serverCount = countMcpServers(mcpContent);
      return {
        name: ".mcp.json",
        status: "ok",
        message: `Found with ${String(serverCount)} server(s) configured`,
      };
    }
  } catch {
    // Not valid JSON
    return { name: ".mcp.json", status: "error", message: "Invalid JSON" };
  }

  try {
    const localContent = await tryReadJson(localPath);
    if (localContent !== null && hasMcpServers(localContent)) {
      return {
        name: "MCP config",
        status: "ok",
        message: "Found in .claude/settings.local.json",
      };
    }
  } catch {
    // Fall through
  }

  return {
    name: "MCP config",
    status: "warning",
    message: "No MCP server configuration found. Run `anvil init` to set up.",
  };
}

async function checkHooksConfig(projectPath: string): Promise<CheckResult> {
  const settingsPath = path.join(projectPath, ".claude", "settings.local.json");

  try {
    const content = await tryReadJson(settingsPath);
    if (content !== null && typeof content === "object" && content !== null && "hooks" in content) {
      return { name: "Hooks", status: "ok", message: "Found in .claude/settings.local.json" };
    }
  } catch {
    // Fall through
  }

  return {
    name: "Hooks",
    status: "warning",
    message: "No hooks configured. Run `anvil init` to set up auto-formatting and safety hooks.",
  };
}

async function checkSlashCommands(projectPath: string): Promise<CheckResult> {
  const commandsDir = path.join(projectPath, ".claude", "commands");
  try {
    const entries = await fs.promises.readdir(commandsDir);
    const mdFiles = entries.filter((e) => e.endsWith(".md"));
    if (mdFiles.length > 0) {
      return {
        name: "Slash commands",
        status: "ok",
        message: `Found ${String(mdFiles.length)} command(s): ${mdFiles.map((f) => "/" + f.replace(".md", "")).join(", ")}`,
      };
    }
  } catch {
    // Directory doesn't exist
  }

  return {
    name: "Slash commands",
    status: "warning",
    message: "No slash commands found. Run `anvil init` to generate.",
  };
}

async function tryReadJson(filePath: string): Promise<unknown> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function countMcpServers(config: unknown): number {
  if (typeof config !== "object" || config === null) return 0;
  const obj = config as Record<string, unknown>;
  const servers = obj["mcpServers"];
  if (typeof servers !== "object" || servers === null) return 0;
  return Object.keys(servers).length;
}

function hasMcpServers(config: unknown): boolean {
  return countMcpServers(config) > 0;
}

function printResults(checks: CheckResult[]): void {
  const log = console.log.bind(console); // eslint-disable-line no-console

  for (const check of checks) {
    const icon = check.status === "ok" ? "+" : check.status === "warning" ? "!" : "x";
    log(`  [${icon}] ${check.name}: ${check.message}`);
  }

  const errors = checks.filter((c) => c.status === "error");
  const warnings = checks.filter((c) => c.status === "warning");

  log("");
  if (errors.length === 0 && warnings.length === 0) {
    log("All checks passed.");
  } else {
    if (errors.length > 0) {
      log(`${String(errors.length)} error(s) found.`);
    }
    if (warnings.length > 0) {
      log(`${String(warnings.length)} warning(s). Run \`anvil init\` to fix.`);
    }
  }
}
