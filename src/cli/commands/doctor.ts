import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface DoctorOptions {
  path?: string;
}

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  fix?: string;
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

  const mcpCheck = await checkMcpConfig(projectPath);
  checks.push(mcpCheck.result);

  // Validate individual MCP servers
  if (mcpCheck.servers !== null) {
    const serverChecks = await checkMcpServers(mcpCheck.servers);
    checks.push(...serverChecks);
  }

  checks.push(await checkHooksConfig(projectPath));
  checks.push(await checkSlashCommands(projectPath));

  printResults(checks);

  const errors = checks.filter((c) => c.status === "error");
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

async function checkFileExists(
  projectPath: string,
  fileName: string,
): Promise<CheckResult> {
  try {
    await fs.promises.access(path.join(projectPath, fileName));
    return { name: fileName, status: "ok", message: "Found" };
  } catch {
    return {
      name: fileName,
      status: "error",
      message: "Not found",
      fix: "Run `anvil init` to generate.",
    };
  }
}

interface McpCheckOutput {
  result: CheckResult;
  servers: Record<string, McpServerEntry> | null;
}

interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

async function checkMcpConfig(projectPath: string): Promise<McpCheckOutput> {
  const mcpJsonPath = path.join(projectPath, ".mcp.json");
  const localPath = path.join(projectPath, ".claude", "settings.local.json");

  // Try .mcp.json first
  const mcpContent = await tryReadJson(mcpJsonPath);
  if (mcpContent !== null) {
    const servers = extractMcpServers(mcpContent);
    if (servers !== null) {
      return {
        result: {
          name: ".mcp.json",
          status: "ok",
          message: `Found with ${String(Object.keys(servers).length)} server(s) configured`,
        },
        servers,
      };
    }
  }

  // Try .claude/settings.local.json
  const localContent = await tryReadJson(localPath);
  if (localContent !== null) {
    const servers = extractMcpServers(localContent);
    if (servers !== null) {
      return {
        result: {
          name: "MCP config",
          status: "ok",
          message: `Found in .claude/settings.local.json with ${String(Object.keys(servers).length)} server(s)`,
        },
        servers,
      };
    }
  }

  return {
    result: {
      name: "MCP config",
      status: "warning",
      message: "No MCP server configuration found.",
      fix: "Run `anvil init` to set up.",
    },
    servers: null,
  };
}

async function checkMcpServers(
  servers: Record<string, McpServerEntry>,
): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  for (const [name, server] of Object.entries(servers)) {
    const command = server.command;
    if (typeof command !== "string") continue;

    // Check if the command exists on PATH
    const isAvailable = await isCommandAvailable(command);
    if (!isAvailable) {
      checks.push({
        name: `  server/${name}`,
        status: "warning",
        message: `Command "${command}" not found on PATH`,
        fix: command === "python"
          ? "Install Python 3: https://python.org"
          : command === "npx"
            ? "Install Node.js: https://nodejs.org"
            : `Install "${command}"`,
      });
      continue;
    }

    // Check env vars
    const envVars = server.env;
    if (typeof envVars === "object" && envVars !== null) {
      for (const [key, value] of Object.entries(envVars)) {
        if (typeof value === "string" && value.startsWith("${") && value.endsWith("}")) {
          const envName = value.slice(2, -1);
          if (process.env[envName] === undefined) {
            checks.push({
              name: `  server/${name}`,
              status: "warning",
              message: `Environment variable ${envName} is not set`,
              fix: `Set ${envName} in your shell profile or .env file`,
            });
          }
        }
      }
    }
  }

  return checks;
}

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    await execFileAsync(which, [command]);
    return true;
  } catch {
    return false;
  }
}

async function checkHooksConfig(projectPath: string): Promise<CheckResult> {
  const settingsPath = path.join(projectPath, ".claude", "settings.local.json");

  const content = await tryReadJson(settingsPath);
  if (
    content !== null &&
    typeof content === "object" &&
    content !== null &&
    "hooks" in content
  ) {
    return {
      name: "Hooks",
      status: "ok",
      message: "Found in .claude/settings.local.json",
    };
  }

  return {
    name: "Hooks",
    status: "warning",
    message: "No hooks configured.",
    fix: "Run `anvil init` to set up auto-formatting hooks.",
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
    message: "No slash commands found.",
    fix: "Run `anvil init` to generate.",
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

function extractMcpServers(config: unknown): Record<string, McpServerEntry> | null {
  if (typeof config !== "object" || config === null) return null;
  const obj = config as Record<string, unknown>;
  const servers = obj["mcpServers"];
  if (typeof servers !== "object" || servers === null) return null;
  if (Object.keys(servers).length === 0) return null;
  return servers as Record<string, McpServerEntry>;
}

function printResults(checks: CheckResult[]): void {
  const log = console.log.bind(console); // eslint-disable-line no-console

  for (const check of checks) {
    const icon =
      check.status === "ok" ? "+" : check.status === "warning" ? "!" : "x";
    log(`  [${icon}] ${check.name}: ${check.message}`);
    if (check.fix !== undefined && check.status !== "ok") {
      log(`      Fix: ${check.fix}`);
    }
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
      log(`${String(warnings.length)} warning(s).`);
    }
  }
}
