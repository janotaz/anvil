import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectPackageManager } from "../../../src/detector/package-manager.js";

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

describe("detectPackageManager", () => {
  // Node.js lockfiles
  it("detects npm from package-lock.json", async () => {
    const fs = mockFs({ "/p/package-lock.json": "" });
    expect(await detectPackageManager("/p", fs)).toBe("npm");
  });

  it("detects yarn from yarn.lock", async () => {
    const fs = mockFs({ "/p/yarn.lock": "" });
    expect(await detectPackageManager("/p", fs)).toBe("yarn");
  });

  it("detects pnpm from pnpm-lock.yaml", async () => {
    const fs = mockFs({ "/p/pnpm-lock.yaml": "" });
    expect(await detectPackageManager("/p", fs)).toBe("pnpm");
  });

  it("detects bun from bun.lockb", async () => {
    const fs = mockFs({ "/p/bun.lockb": "" });
    expect(await detectPackageManager("/p", fs)).toBe("bun");
  });

  // Specificity: bun.lockb should win over package-lock.json
  it("prefers bun over npm when both lockfiles exist", async () => {
    const fs = mockFs({
      "/p/bun.lockb": "",
      "/p/package-lock.json": "",
    });
    expect(await detectPackageManager("/p", fs)).toBe("bun");
  });

  it("prefers pnpm over npm when both lockfiles exist", async () => {
    const fs = mockFs({
      "/p/pnpm-lock.yaml": "",
      "/p/package-lock.json": "",
    });
    expect(await detectPackageManager("/p", fs)).toBe("pnpm");
  });

  // Python lockfiles
  it("detects uv from uv.lock", async () => {
    const fs = mockFs({ "/p/uv.lock": "" });
    expect(await detectPackageManager("/p", fs)).toBe("uv");
  });

  it("detects poetry from poetry.lock", async () => {
    const fs = mockFs({ "/p/poetry.lock": "" });
    expect(await detectPackageManager("/p", fs)).toBe("poetry");
  });

  it("detects pipenv from Pipfile.lock", async () => {
    const fs = mockFs({ "/p/Pipfile.lock": "" });
    expect(await detectPackageManager("/p", fs)).toBe("pipenv");
  });

  it("detects pipenv from Pipfile (no lockfile)", async () => {
    const fs = mockFs({ "/p/Pipfile": "" });
    expect(await detectPackageManager("/p", fs)).toBe("pipenv");
  });

  // pyproject.toml fallbacks
  it("detects poetry from pyproject.toml [tool.poetry]", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.poetry]\nname = 'test'",
    });
    expect(await detectPackageManager("/p", fs)).toBe("poetry");
  });

  it("falls back to pip for pyproject.toml without poetry", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[project]\nname = 'test'",
    });
    expect(await detectPackageManager("/p", fs)).toBe("pip");
  });

  it("falls back to pip for requirements.txt", async () => {
    const fs = mockFs({
      "/p/requirements.txt": "flask==2.0",
    });
    expect(await detectPackageManager("/p", fs)).toBe("pip");
  });

  // Fallback for package.json without lockfile
  it("falls back to npm for package.json without lockfile", async () => {
    const fs = mockFs({
      "/p/package.json": "{}",
    });
    expect(await detectPackageManager("/p", fs)).toBe("npm");
  });

  // No signals
  it("returns null when no signals found", async () => {
    const fs = mockFs({});
    expect(await detectPackageManager("/p", fs)).toBeNull();
  });
});
