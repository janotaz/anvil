import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectLinters } from "../../../src/detector/linter.js";

function mockFs(files: Record<string, string | null>): FileSystem {
  return {
    async exists(path: string): Promise<boolean> {
      return path in files;
    },
    async readFile(path: string): Promise<string | null> {
      return files[path] ?? null;
    },
    async readDir(): Promise<string[]> {
      return [];
    },
  };
}

describe("detectLinters", () => {
  // Node.js: ESLint
  it("detects eslint from eslint.config.js", async () => {
    const fs = mockFs({ "/p/eslint.config.js": "" });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "eslint",
      command: { command: "npx eslint .", source: "eslint.config.js" },
    });
  });

  it("detects eslint from .eslintrc.json", async () => {
    const fs = mockFs({ "/p/.eslintrc.json": "" });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "eslint")).toBe(true);
  });

  it("detects eslint from eslint.config.mjs", async () => {
    const fs = mockFs({ "/p/eslint.config.mjs": "" });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "eslint")).toBe(true);
  });

  // Node.js: Prettier
  it("detects prettier from .prettierrc", async () => {
    const fs = mockFs({ "/p/.prettierrc": "" });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "prettier",
      command: { command: "npx prettier --check .", source: ".prettierrc" },
    });
  });

  it("detects prettier from prettier.config.js", async () => {
    const fs = mockFs({ "/p/prettier.config.js": "" });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "prettier")).toBe(true);
  });

  // ESLint + Prettier together
  it("detects both eslint and prettier", async () => {
    const fs = mockFs({
      "/p/eslint.config.js": "",
      "/p/.prettierrc": "",
    });
    const result = await detectLinters("/p", fs);
    expect(result).toHaveLength(2);
    expect(result.some((l) => l.name === "eslint")).toBe(true);
    expect(result.some((l) => l.name === "prettier")).toBe(true);
  });

  // Biome replaces ESLint + Prettier
  it("detects biome and excludes eslint/prettier", async () => {
    const fs = mockFs({
      "/p/biome.json": "",
      "/p/eslint.config.js": "",
      "/p/.prettierrc": "",
    });
    const result = await detectLinters("/p", fs);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("biome");
    expect(result[0]?.command.command).toBe("npx biome check .");
  });

  it("detects biome from biome.jsonc", async () => {
    const fs = mockFs({ "/p/biome.jsonc": "" });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "biome")).toBe(true);
  });

  // Python: Ruff
  it("detects ruff from ruff.toml", async () => {
    const fs = mockFs({ "/p/ruff.toml": "" });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "ruff",
      command: { command: "ruff check .", source: "ruff.toml" },
    });
  });

  it("detects ruff from pyproject.toml [tool.ruff]", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.ruff]\nline-length = 88",
    });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "ruff")).toBe(true);
  });

  // Python: Black
  it("detects black from pyproject.toml [tool.black]", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.black]\nline-length = 88",
    });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "black",
      command: { command: "black --check .", source: "pyproject.toml [tool.black]" },
    });
  });

  // Python: Flake8
  it("detects flake8 from .flake8", async () => {
    const fs = mockFs({ "/p/.flake8": "" });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "flake8",
      command: { command: "flake8 .", source: ".flake8" },
    });
  });

  it("detects flake8 from setup.cfg [flake8]", async () => {
    const fs = mockFs({
      "/p/setup.cfg": "[flake8]\nmax-line-length = 120",
    });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "flake8")).toBe(true);
  });

  // Python: Mypy
  it("detects mypy from pyproject.toml [tool.mypy]", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.mypy]\nstrict = true",
    });
    const result = await detectLinters("/p", fs);
    expect(result).toContainEqual({
      name: "mypy",
      command: { command: "mypy .", source: "pyproject.toml [tool.mypy]" },
    });
  });

  it("detects mypy from mypy.ini", async () => {
    const fs = mockFs({ "/p/mypy.ini": "" });
    const result = await detectLinters("/p", fs);
    expect(result.some((l) => l.name === "mypy")).toBe(true);
  });

  // Multiple Python linters
  it("detects ruff + mypy together", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.ruff]\nline-length = 88\n\n[tool.mypy]\nstrict = true",
    });
    const result = await detectLinters("/p", fs);
    expect(result).toHaveLength(2);
    expect(result.some((l) => l.name === "ruff")).toBe(true);
    expect(result.some((l) => l.name === "mypy")).toBe(true);
  });

  // No signals
  it("returns empty array when no linters found", async () => {
    const fs = mockFs({});
    const result = await detectLinters("/p", fs);
    expect(result).toEqual([]);
  });
});
