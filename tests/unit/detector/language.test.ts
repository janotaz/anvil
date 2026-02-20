import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectLanguage } from "../../../src/detector/language.js";

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

describe("detectLanguage", () => {
  it("detects TypeScript when tsconfig.json exists", async () => {
    const fs = mockFs({
      "/project/package.json": "{}",
      "/project/tsconfig.json": "{}",
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["typescript"]);
  });

  it("detects TypeScript from devDependencies", async () => {
    const fs = mockFs({
      "/project/package.json": JSON.stringify({
        devDependencies: { typescript: "^5.0.0" },
      }),
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["typescript"]);
  });

  it("detects JavaScript when no TypeScript signals", async () => {
    const fs = mockFs({
      "/project/package.json": JSON.stringify({ name: "test" }),
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["javascript"]);
  });

  it("detects Python from pyproject.toml", async () => {
    const fs = mockFs({
      "/project/pyproject.toml": "[project]\nname = 'test'",
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["python"]);
  });

  it("detects Python from requirements.txt", async () => {
    const fs = mockFs({
      "/project/requirements.txt": "flask==2.0.0",
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["python"]);
  });

  it("detects both TypeScript and Python in mixed project", async () => {
    const fs = mockFs({
      "/project/package.json": "{}",
      "/project/tsconfig.json": "{}",
      "/project/pyproject.toml": "[project]\nname = 'test'",
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["typescript", "python"]);
  });

  it("returns empty array when no language signals found", async () => {
    const fs = mockFs({});
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual([]);
  });

  it("handles malformed package.json gracefully", async () => {
    const fs = mockFs({
      "/project/package.json": "not json",
    });
    const result = await detectLanguage("/project", fs);
    expect(result).toEqual(["javascript"]);
  });
});
