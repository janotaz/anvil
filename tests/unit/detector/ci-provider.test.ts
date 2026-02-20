import { describe, it, expect } from "vitest";
import type { FileSystem } from "../../../src/detector/index.js";
import { detectCIProvider } from "../../../src/detector/ci-provider.js";

function mockFs(dirs: Record<string, string[]>): FileSystem {
  return {
    async exists(): Promise<boolean> {
      return false;
    },
    async readFile(): Promise<string | null> {
      return null;
    },
    async readDir(path: string): Promise<string[]> {
      return dirs[path] ?? [];
    },
  };
}

describe("detectCIProvider", () => {
  it("detects GitHub Actions from .yml workflows", async () => {
    const fs = mockFs({
      "/p/.github/workflows": ["ci.yml", "release.yml"],
    });
    expect(await detectCIProvider("/p", fs)).toBe("github-actions");
  });

  it("detects GitHub Actions from .yaml workflows", async () => {
    const fs = mockFs({
      "/p/.github/workflows": ["build.yaml"],
    });
    expect(await detectCIProvider("/p", fs)).toBe("github-actions");
  });

  it("ignores non-YAML files in workflows dir", async () => {
    const fs = mockFs({
      "/p/.github/workflows": ["README.md", ".gitkeep"],
    });
    expect(await detectCIProvider("/p", fs)).toBeNull();
  });

  it("returns null when no workflows directory", async () => {
    const fs = mockFs({});
    expect(await detectCIProvider("/p", fs)).toBeNull();
  });

  it("returns null when workflows directory is empty", async () => {
    const fs = mockFs({
      "/p/.github/workflows": [],
    });
    expect(await detectCIProvider("/p", fs)).toBeNull();
  });
});
