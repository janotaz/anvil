import { describe, it, expect } from "vitest";
import { detectProject, type FileSystem } from "../../../src/detector/index.js";

/**
 * Creates a mock filesystem where files is a map of path → content.
 * Directories are simulated by having entries in the dirs map.
 */
function mockFs(
  files: Record<string, string | null>,
  dirs: Record<string, string[]> = {},
): FileSystem {
  return {
    async exists(path: string): Promise<boolean> {
      return path in files || path in dirs;
    },
    async readFile(path: string): Promise<string | null> {
      return files[path] ?? null;
    },
    async readDir(path: string): Promise<string[]> {
      return dirs[path] ?? [];
    },
  };
}

describe("detectProject", () => {
  it("detects a complete TypeScript project", async () => {
    const fs = mockFs(
      {
        "/p/package.json": JSON.stringify({
          scripts: { test: "vitest run", build: "tsc" },
        }),
        "/p/tsconfig.json": "{}",
        "/p/package-lock.json": "",
        "/p/eslint.config.js": "",
        "/p/.prettierrc": "{}",
      },
      {
        "/p": ["src", "tests", "docs", "node_modules", ".git"],
        "/p/.github/workflows": ["ci.yml"],
      },
    );

    const result = await detectProject("/p", fs);

    expect(result.languages).toEqual(["typescript"]);
    expect(result.packageManager).toBe("npm");
    expect(result.testFramework?.name).toBe("vitest");
    expect(result.buildSystem?.name).toBe("tsc");
    expect(result.ciProvider).toBe("github-actions");
    expect(result.linters).toHaveLength(2);
    expect(result.isMonorepo).toBe(false);
    expect(result.installCommand).toEqual({
      command: "npm install",
      source: "npm convention",
    });
    expect(result.directories).toContain("src");
    expect(result.directories).toContain("tests");
    expect(result.directories).toContain("docs");
    // node_modules and .git should not be in directories
    expect(result.directories).not.toContain("node_modules");
    expect(result.directories).not.toContain(".git");
  });

  it("detects a Python project", async () => {
    const fs = mockFs(
      {
        "/p/pyproject.toml":
          '[tool.pytest.ini_options]\naddopts = "-v"\n\n[tool.ruff]\nline-length = 88\n\n[tool.mypy]\nstrict = true',
        "/p/uv.lock": "",
      },
      {
        "/p": ["src", "tests"],
        "/p/.github/workflows": [],
      },
    );

    const result = await detectProject("/p", fs);

    expect(result.languages).toEqual(["python"]);
    expect(result.packageManager).toBe("uv");
    expect(result.testFramework?.name).toBe("pytest");
    expect(result.ciProvider).toBeNull();
    expect(result.linters.some((l) => l.name === "ruff")).toBe(true);
    expect(result.linters.some((l) => l.name === "mypy")).toBe(true);
    expect(result.installCommand).toEqual({
      command: "uv sync",
      source: "uv convention",
    });
  });

  it("detects a monorepo", async () => {
    const fs = mockFs(
      {
        "/p/package.json": JSON.stringify({ workspaces: ["packages/*"] }),
        "/p/pnpm-lock.yaml": "",
        "/p/pnpm-workspace.yaml": "",
      },
      { "/p": ["packages"], "/p/.github/workflows": [] },
    );

    const result = await detectProject("/p", fs);

    expect(result.isMonorepo).toBe(true);
    expect(result.packageManager).toBe("pnpm");
  });

  it("detects monorepo from package.json workspaces", async () => {
    const fs = mockFs(
      {
        "/p/package.json": JSON.stringify({
          workspaces: ["apps/*", "packages/*"],
        }),
        "/p/yarn.lock": "",
      },
      { "/p": [], "/p/.github/workflows": [] },
    );

    const result = await detectProject("/p", fs);

    expect(result.isMonorepo).toBe(true);
    expect(result.packageManager).toBe("yarn");
  });

  it("handles an empty project", async () => {
    const fs = mockFs({}, { "/p": [], "/p/.github/workflows": [] });

    const result = await detectProject("/p", fs);

    expect(result.languages).toEqual([]);
    expect(result.packageManager).toBeNull();
    expect(result.testFramework).toBeNull();
    expect(result.buildSystem).toBeNull();
    expect(result.ciProvider).toBeNull();
    expect(result.linters).toEqual([]);
    expect(result.isMonorepo).toBe(false);
    expect(result.installCommand).toBeNull();
    expect(result.directories).toEqual([]);
  });

  it("derives correct install commands for each package manager", async () => {
    const managers = [
      { lockfile: "yarn.lock", expected: "yarn install" },
      { lockfile: "pnpm-lock.yaml", expected: "pnpm install" },
      { lockfile: "bun.lockb", expected: "bun install" },
    ];

    for (const { lockfile, expected } of managers) {
      const fs = mockFs({ [`/p/${lockfile}`]: "" }, { "/p": [], "/p/.github/workflows": [] });
      const result = await detectProject("/p", fs);
      expect(result.installCommand?.command).toBe(expected);
    }
  });
});
