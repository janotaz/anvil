import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectBuildSystem } from "../../../src/detector/build-system.js";

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

describe("detectBuildSystem", () => {
  // Node.js: config files
  it("detects vite from vite.config.ts", async () => {
    const fs = mockFs({ "/p/vite.config.ts": "" });
    const result = await detectBuildSystem("/p", fs);
    expect(result).toEqual({
      name: "vite",
      command: { command: "npx vite build", source: "vite.config.ts" },
    });
  });

  it("detects vite from vite.config.mjs", async () => {
    const fs = mockFs({ "/p/vite.config.mjs": "" });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("vite");
  });

  it("detects webpack from webpack.config.js", async () => {
    const fs = mockFs({ "/p/webpack.config.js": "" });
    const result = await detectBuildSystem("/p", fs);
    expect(result).toEqual({
      name: "webpack",
      command: { command: "npx webpack", source: "webpack.config.js" },
    });
  });

  it("detects rollup from rollup.config.js", async () => {
    const fs = mockFs({ "/p/rollup.config.js": "" });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("rollup");
  });

  // Node.js: package.json scripts fallback
  it("detects vite from build script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { build: "vite build" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result).toEqual({
      name: "vite",
      command: { command: "npm run build", source: "package.json scripts.build" },
    });
  });

  it("detects esbuild from build script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { build: "esbuild src/index.ts --bundle" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("esbuild");
  });

  it("detects tsc from build script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { build: "tsc" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("tsc");
    expect(result?.command.command).toBe("npm run build");
  });

  it("detects webpack from build script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { build: "webpack --mode production" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("webpack");
  });

  it("detects rollup from build script", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({
        scripts: { build: "rollup -c" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("rollup");
  });

  // Config file takes precedence over scripts
  it("prefers config file over package.json scripts", async () => {
    const fs = mockFs({
      "/p/vite.config.ts": "",
      "/p/package.json": JSON.stringify({
        scripts: { build: "tsc" },
      }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("vite");
    expect(result?.command.source).toBe("vite.config.ts");
  });

  // tsc fallback from tsconfig.json
  it("falls back to tsc when tsconfig.json exists and no other build tool", async () => {
    const fs = mockFs({
      "/p/tsconfig.json": "{}",
      "/p/package.json": JSON.stringify({ scripts: {} }),
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result).toEqual({
      name: "tsc",
      command: { command: "npx tsc", source: "tsconfig.json" },
    });
  });

  // Python
  it("detects hatch from pyproject.toml", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.hatch]\n[tool.hatch.build]",
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("hatch");
  });

  it("detects hatch from hatchling backend", async () => {
    const fs = mockFs({
      "/p/pyproject.toml":
        '[build-system]\nrequires = ["hatchling"]\nbuild-backend = "hatchling.build"',
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("hatch");
  });

  it("detects maturin from pyproject.toml", async () => {
    const fs = mockFs({
      "/p/pyproject.toml": "[tool.maturin]\nbindings = 'pyo3'",
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("maturin");
  });

  it("detects setuptools from pyproject.toml", async () => {
    const fs = mockFs({
      "/p/pyproject.toml":
        '[build-system]\nrequires = ["setuptools"]\nbuild-backend = "setuptools.build_meta"',
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result?.name).toBe("setuptools");
  });

  it("detects setuptools from setup.py", async () => {
    const fs = mockFs({
      "/p/setup.py": "from setuptools import setup",
    });
    const result = await detectBuildSystem("/p", fs);
    expect(result).toEqual({
      name: "setuptools",
      command: { command: "python -m build", source: "setup.py" },
    });
  });

  // No signals
  it("returns null when no build system found", async () => {
    const fs = mockFs({});
    expect(await detectBuildSystem("/p", fs)).toBeNull();
  });

  it("returns null for package.json without build script and no tsconfig", async () => {
    const fs = mockFs({
      "/p/package.json": JSON.stringify({ scripts: { test: "jest" } }),
    });
    expect(await detectBuildSystem("/p", fs)).toBeNull();
  });

  // Edge cases
  it("handles malformed package.json", async () => {
    const fs = mockFs({
      "/p/package.json": "not json",
    });
    expect(await detectBuildSystem("/p", fs)).toBeNull();
  });
});
