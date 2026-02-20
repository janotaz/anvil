import { describe, it, expect } from "vitest";
import { emptyDetectionResult, DetectionResultSchema } from "../../../src/detector/types.js";

describe("DetectionResult", () => {
  it("emptyDetectionResult returns valid schema", () => {
    const result = emptyDetectionResult();
    const parsed = DetectionResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("emptyDetectionResult has expected defaults", () => {
    const result = emptyDetectionResult();
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

  it("validates a complete detection result", () => {
    const result = {
      languages: ["typescript" as const],
      packageManager: "npm" as const,
      testFramework: {
        name: "vitest" as const,
        command: { command: "npx vitest run", source: "vitest.config.ts" },
      },
      buildSystem: {
        name: "tsc" as const,
        command: { command: "npm run build", source: "package.json scripts.build" },
      },
      ciProvider: "github-actions" as const,
      linters: [
        {
          name: "eslint" as const,
          command: { command: "npx eslint .", source: "eslint.config.js" },
        },
      ],
      isMonorepo: false,
      installCommand: { command: "npm install", source: "npm convention" },
      directories: ["src", "tests"],
    };
    const parsed = DetectionResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid language", () => {
    const result = emptyDetectionResult();
    (result as Record<string, unknown>).languages = ["rust"];
    const parsed = DetectionResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
  });
});
