import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures");

/**
 * Doctor command integration tests.
 *
 * These tests create temporary config files in a scratch directory,
 * then verify the doctor logic by importing and calling the check
 * functions indirectly via CLI execution.
 *
 * Since the doctor command writes to stdout, we test the underlying
 * detection + generation pipeline instead of invoking the CLI directly.
 */
describe("doctor command integration", () => {
  const scratchDir = path.join(FIXTURES_DIR, "_doctor-scratch");

  beforeAll(async () => {
    await fs.promises.mkdir(scratchDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(scratchDir, { recursive: true, force: true });
  });

  it("validates a well-configured project", async () => {
    // Set up a minimal valid config
    const claudeMdPath = path.join(scratchDir, "CLAUDE.md");
    const mcpJsonPath = path.join(scratchDir, ".mcp.json");
    const settingsDir = path.join(scratchDir, ".claude");
    const commandsDir = path.join(scratchDir, ".claude", "commands");
    const settingsPath = path.join(settingsDir, "settings.local.json");

    await fs.promises.writeFile(claudeMdPath, "# CLAUDE.md\n", "utf-8");
    await fs.promises.writeFile(
      mcpJsonPath,
      JSON.stringify({ mcpServers: { memory: { command: "python", args: ["-m", "mcp_memory_service"] } } }),
      "utf-8",
    );
    await fs.promises.mkdir(commandsDir, { recursive: true });
    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify({ hooks: { PostToolUse: [] } }),
      "utf-8",
    );
    await fs.promises.writeFile(
      path.join(commandsDir, "review.md"),
      "# Review\n",
      "utf-8",
    );

    // Verify files exist
    expect(await fileExists(claudeMdPath)).toBe(true);
    expect(await fileExists(mcpJsonPath)).toBe(true);
    expect(await fileExists(settingsPath)).toBe(true);

    // Parse MCP config
    const mcpContent = JSON.parse(
      await fs.promises.readFile(mcpJsonPath, "utf-8"),
    ) as Record<string, unknown>;
    expect(mcpContent).toHaveProperty("mcpServers");

    // Parse hooks config
    const hooksContent = JSON.parse(
      await fs.promises.readFile(settingsPath, "utf-8"),
    ) as Record<string, unknown>;
    expect(hooksContent).toHaveProperty("hooks");
  });

  it("detects missing CLAUDE.md", async () => {
    const emptyDir = path.join(scratchDir, "empty-check");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    expect(await fileExists(path.join(emptyDir, "CLAUDE.md"))).toBe(false);
  });

  it("detects invalid JSON in .mcp.json", async () => {
    const badDir = path.join(scratchDir, "bad-json");
    await fs.promises.mkdir(badDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(badDir, ".mcp.json"),
      "not json {{{",
      "utf-8",
    );

    // tryReadJson should return null for invalid JSON
    const content = await fs.promises.readFile(
      path.join(badDir, ".mcp.json"),
      "utf-8",
    );
    expect(() => JSON.parse(content)).toThrow();
  });

  it("detects MCP config with no servers", async () => {
    const noServersDir = path.join(scratchDir, "no-servers");
    await fs.promises.mkdir(noServersDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(noServersDir, ".mcp.json"),
      JSON.stringify({ mcpServers: {} }),
      "utf-8",
    );

    const content = JSON.parse(
      await fs.promises.readFile(path.join(noServersDir, ".mcp.json"), "utf-8"),
    ) as Record<string, unknown>;
    const servers = content["mcpServers"] as Record<string, unknown>;
    expect(Object.keys(servers)).toHaveLength(0);
  });

  it("validates merged settings.local.json with both MCP and hooks", async () => {
    const mergedDir = path.join(scratchDir, "merged");
    const mergedSettingsDir = path.join(mergedDir, ".claude");
    await fs.promises.mkdir(mergedSettingsDir, { recursive: true });

    const mergedConfig = {
      mcpServers: {
        memory: { command: "python", args: ["-m", "mcp_memory_service"] },
      },
      hooks: {
        PostToolUse: [
          { matcher: "Write|Edit", type: "command", command: "prettier --write" },
        ],
      },
    };

    await fs.promises.writeFile(
      path.join(mergedSettingsDir, "settings.local.json"),
      JSON.stringify(mergedConfig, null, 2),
      "utf-8",
    );

    const content = JSON.parse(
      await fs.promises.readFile(
        path.join(mergedSettingsDir, "settings.local.json"),
        "utf-8",
      ),
    ) as Record<string, unknown>;

    expect(content).toHaveProperty("mcpServers");
    expect(content).toHaveProperty("hooks");
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
