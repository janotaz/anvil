import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectTestFramework } from "../../../src/detector/test-framework.js";

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

describe("detectTestFramework", () => {
  // Node.js: config files
  it("detects vitest from vitest.config.ts", async () => {
    const fs = mockFs({ "/p/vitest.config.ts": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result).toEqual({
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    });
  });

  it("detects vitest from vitest.config.mts", async () => {
    const fs = mockFs({ "/p/vitest.config.mts": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("vitest");
  });

  it("detects jest from jest.config.ts", async () => {
    const fs = mockFs({ "/p/jest.config.ts": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result).toEqual({
      name: "jest",
      command: { command: "npx jest", source: "jest.config.ts" },
    });
  });

  it("detects jest from jest.config.js", async () => {
    const fs = mockFs({ "/p/jest.config.js": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("jest");
  });

  it("detects mocha from .mocharc.yml", async () => {
    const fs = mockFs({ "/p/.mocharc.yml": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result).toEqual({
      name: "mocha",
      command: { command: "npx mocha", source: ".mocharc.yml" },
    });
  });

  it("detects mocha from .mocharc.json", async () => {
    const fs = mockFs({ "/p/.mocharc.json": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("mocha");
  });

  // Node.js: package.json scripts fallback
  it("detects vitest from package.json test script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { test: "vitest run" },
      }),
    });
    const result = await detectTestFramework("/p", fs);
    expect(result).toEqual({
      name: "vitest",
      command: { command: "npm test", source: "package.json scripts.test" },
    });
  });

  it("detects jest from package.json test script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { test: "jest --coverage" },
      }),
    });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("jest");
  });

  it("detects mocha from package.json test script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { test: "mocha 'tests/**/*.test.js'" },
      }),
    });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("mocha");
  });

  // Config file takes precedence over scripts
  it("prefers config file over package.json scripts", async () => {
    const fs = mockFs({
      "/p/vitest.config.ts": "",
      "/p/package.json": JSON.stringify({
        scripts: { test: "jest" },
      }),
    });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("vitest");
    expect(result?.command.source).toBe("vitest.config.ts");
  });

  // Python
  it("detects pytest from pytest.ini", async () => {
    const fs = mockFs({ "/p/pytest.ini": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result).toEqual({
      name: "pytest",
      command: { command: "pytest", source: "pytest.ini" },
    });
  });

  it("detects pytest from conftest.py", async () => {
    const fs = mockFs({ "/p/conftest.py": "" });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("pytest");
    expect(result?.command.source).toBe("conftest.py");
  });

  it("detects pytest from pyproject.toml [tool.pytest]", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.pytest.ini_options]\naddopts = '-v'",
    });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("pytest");
    expect(result?.command.source).toBe("pyproject.toml [tool.pytest]");
  });

  it("detects pytest from setup.cfg [tool:pytest]", async () => {
    const fs = mockFs({
      "/p/setup.cfg": "[tool:pytest]\naddopts = -v",
    });
    const result = await detectTestFramework("/p", fs);
    expect(result?.name).toBe("pytest");
    expect(result?.command.source).toBe("setup.cfg [tool:pytest]");
  });

  // No signals
  it("returns null when no test framework found", async () => {
    const fs = mockFs({});
    expect(await detectTestFramework("/p", fs)).toBeNull();
  });

  it("returns null for package.json without test script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({ scripts: { build: "tsc" } }),
    });
    expect(await detectTestFramework("/p", fs)).toBeNull();
  });

  it("returns null for unrecognized test script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { test: "echo 'no tests'" },
      }),
    });
    expect(await detectTestFramework("/p", fs)).toBeNull();
  });

  // Edge cases
  it("handles malformed package.json", async () => {
    const fs = mockFs({ "/p/package.json": "not json" });
    expect(await detectTestFramework("/p", fs)).toBeNull();
  });
});
