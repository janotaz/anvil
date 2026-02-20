import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { detectProject, type FileSystem } from "../../src/detector/index.js";
import { generateAll } from "../../src/generator/index.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures");

/** Real filesystem implementation for integration tests. */
const realFs: FileSystem = {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  },
  async readDir(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch {
      return [];
    }
  },
};

describe("init command integration", () => {
  describe("Node.js/TypeScript project", () => {
    const projectPath = path.join(FIXTURES_DIR, "node-ts-project");

    it("detects all characteristics", async () => {
      const result = await detectProject(projectPath, realFs);

      expect(result.languages).toContain("typescript");
      expect(result.packageManager).toBe("npm");
      expect(result.testFramework?.name).toBe("vitest");
      expect(result.buildSystem?.name).toBe("tsc");
      expect(result.ciProvider).toBe("github-actions");
      expect(result.linters.some((l) => l.name === "eslint")).toBe(true);
      expect(result.linters.some((l) => l.name === "prettier")).toBe(true);
      expect(result.isMonorepo).toBe(false);
      expect(result.directories).toContain("src");
      expect(result.directories).toContain("tests");
    });

    it("generates valid CLAUDE.md", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const claudeMd = files.find((f) => f.relativePath === "CLAUDE.md");
      expect(claudeMd).toBeDefined();
      expect(claudeMd?.content).toContain("npm install");
      expect(claudeMd?.content).toContain("npm test");
      expect(claudeMd?.content).toContain("npm run build");
      expect(claudeMd?.content).toContain("lsmcp");
      expect(claudeMd?.content).toContain("github");
    });

    it("generates .mcp.json with all 4 servers", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const mcpJson = files.find((f) => f.relativePath === ".mcp.json");
      expect(mcpJson).toBeDefined();

      const config = JSON.parse(mcpJson!.content) as Record<string, unknown>;
      const servers = config["mcpServers"] as Record<string, unknown>;
      expect(servers).toHaveProperty("memory");
      expect(servers).toHaveProperty("lsp");
      expect(servers).toHaveProperty("github");
      expect(servers).toHaveProperty("coverage");
    });

    it("generates hooks with prettier formatter", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const hooks = files.find(
        (f) =>
          f.relativePath === ".claude/settings.local.json" &&
          f.content.includes("hooks"),
      );
      expect(hooks).toBeDefined();
      expect(hooks?.content).toContain("prettier");
    });

    it("generates slash commands", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const review = files.find((f) => f.relativePath === ".claude/commands/review.md");
      const test = files.find((f) => f.relativePath === ".claude/commands/test.md");
      expect(review).toBeDefined();
      expect(test).toBeDefined();
    });
  });

  describe("Python project", () => {
    const projectPath = path.join(FIXTURES_DIR, "python-project");

    it("detects all characteristics", async () => {
      const result = await detectProject(projectPath, realFs);

      expect(result.languages).toContain("python");
      expect(result.packageManager).toBe("uv");
      expect(result.testFramework?.name).toBe("pytest");
      expect(result.buildSystem?.name).toBe("hatch");
      expect(result.linters.some((l) => l.name === "ruff")).toBe(true);
      expect(result.linters.some((l) => l.name === "mypy")).toBe(true);
    });

    it("generates CLAUDE.md with Python-specific content", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const claudeMd = files.find((f) => f.relativePath === "CLAUDE.md");
      expect(claudeMd?.content).toContain("pytest");
      expect(claudeMd?.content).toContain("uv sync");
      expect(claudeMd?.content).toContain("tree-sitter");
    });

    it("generates .mcp.json with tree-sitter instead of lsmcp", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const mcpJson = files.find((f) => f.relativePath === ".mcp.json");
      const config = JSON.parse(mcpJson!.content) as Record<string, unknown>;
      const servers = config["mcpServers"] as Record<string, unknown>;
      expect(servers).toHaveProperty("tree-sitter");
      expect(servers).not.toHaveProperty("lsp");
    });

    it("generates ruff formatter hook", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const hooks = files.find(
        (f) =>
          f.relativePath === ".claude/settings.local.json" &&
          f.content.includes("hooks"),
      );
      expect(hooks?.content).toContain("ruff format");
    });
  });

  describe("Poetry project", () => {
    const projectPath = path.join(FIXTURES_DIR, "poetry-project");

    it("detects all characteristics", async () => {
      const result = await detectProject(projectPath, realFs);

      expect(result.languages).toContain("python");
      expect(result.packageManager).toBe("poetry");
      expect(result.testFramework?.name).toBe("pytest");
      expect(result.linters.some((l) => l.name === "black")).toBe(true);
      expect(result.linters.some((l) => l.name === "mypy")).toBe(true);
    });

    it("generates CLAUDE.md with poetry install", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const claudeMd = files.find((f) => f.relativePath === "CLAUDE.md");
      expect(claudeMd?.content).toContain("poetry install");
      expect(claudeMd?.content).toContain("pytest");
    });

    it("generates black formatter hook", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const hooks = files.find(
        (f) =>
          f.relativePath === ".claude/settings.local.json" &&
          f.content.includes("hooks"),
      );
      expect(hooks?.content).toContain("black");
    });
  });

  describe("Setuptools project", () => {
    const projectPath = path.join(FIXTURES_DIR, "setuptools-project");

    it("detects all characteristics", async () => {
      const result = await detectProject(projectPath, realFs);

      expect(result.languages).toContain("python");
      expect(result.packageManager).toBe("pip");
      expect(result.testFramework?.name).toBe("pytest");
      expect(result.testFramework?.command.source).toBe("setup.cfg [tool:pytest]");
      expect(result.buildSystem?.name).toBe("setuptools");
      expect(result.linters.some((l) => l.name === "flake8")).toBe(true);
    });

    it("generates CLAUDE.md with pip install", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const claudeMd = files.find((f) => f.relativePath === "CLAUDE.md");
      expect(claudeMd?.content).toContain("pip install");
      expect(claudeMd?.content).toContain("pytest");
    });
  });

  describe("Empty project", () => {
    const projectPath = path.join(FIXTURES_DIR, "empty-project");

    it("handles empty project gracefully", async () => {
      const result = await detectProject(projectPath, realFs);

      expect(result.languages).toEqual([]);
      expect(result.packageManager).toBeNull();
      expect(result.testFramework).toBeNull();
      expect(result.buildSystem).toBeNull();
      expect(result.ciProvider).toBeNull();
      expect(result.linters).toEqual([]);
    });

    it("still generates CLAUDE.md for empty project", async () => {
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const claudeMd = files.find((f) => f.relativePath === "CLAUDE.md");
      expect(claudeMd).toBeDefined();
      expect(claudeMd?.content).toContain("# CLAUDE.md");
    });
  });

  describe("--local flag", () => {
    it("writes MCP config to .claude/settings.local.json when local=true", async () => {
      const projectPath = path.join(FIXTURES_DIR, "node-ts-project");
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: true });

      const mcpConfig = files.find((f) => f.content.includes("mcpServers"));
      expect(mcpConfig?.relativePath).toBe(".claude/settings.local.json");
    });

    it("writes MCP config to .mcp.json when local=false", async () => {
      const projectPath = path.join(FIXTURES_DIR, "node-ts-project");
      const result = await detectProject(projectPath, realFs);
      const files = generateAll(result, { local: false });

      const mcpConfig = files.find((f) => f.content.includes("mcpServers"));
      expect(mcpConfig?.relativePath).toBe(".mcp.json");
    });
  });
});
