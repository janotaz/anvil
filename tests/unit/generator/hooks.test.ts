import { describe, it, expect } from "vitest";
import { generateHooksConfig } from "../../../src/generator/hooks.js";
import { emptyDetectionResult } from "../../../src/detector/types.js";

describe("generateHooksConfig", () => {
  it("returns null when no linters detected", () => {
    const result = emptyDetectionResult();
    expect(generateHooksConfig(result)).toBeNull();
  });

  it("generates prettier hook", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "prettier", command: { command: "npx prettier --check .", source: ".prettierrc" } },
    ];

    const output = generateHooksConfig(result);
    expect(output).not.toBeNull();

    const config = JSON.parse(output!) as Record<string, unknown>;
    const hooks = config["hooks"] as Record<string, unknown>;
    const postToolUse = hooks["PostToolUse"] as Array<Record<string, string>>;

    expect(postToolUse).toHaveLength(1);
    expect(postToolUse[0]?.matcher).toBe("Write|Edit");
    expect(postToolUse[0]?.command).toContain("prettier");
    expect(postToolUse[0]?.command).toContain("$CLAUDE_FILE_PATH");
  });

  it("generates biome hook when biome is present", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "biome", command: { command: "npx biome check .", source: "biome.json" } },
    ];

    const output = generateHooksConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const hooks = config["hooks"] as Record<string, unknown>;
    const postToolUse = hooks["PostToolUse"] as Array<Record<string, string>>;

    expect(postToolUse[0]?.command).toContain("biome format");
  });

  it("generates black hook for Python projects", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "black", command: { command: "black --check .", source: "pyproject.toml" } },
    ];

    const output = generateHooksConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const hooks = config["hooks"] as Record<string, unknown>;
    const postToolUse = hooks["PostToolUse"] as Array<Record<string, string>>;

    expect(postToolUse[0]?.command).toContain("black");
  });

  it("generates ruff hook for Python projects", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "ruff", command: { command: "ruff check .", source: "ruff.toml" } },
    ];

    const output = generateHooksConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const hooks = config["hooks"] as Record<string, unknown>;
    const postToolUse = hooks["PostToolUse"] as Array<Record<string, string>>;

    expect(postToolUse[0]?.command).toContain("ruff format");
  });

  it("returns null when linter has no formatter (eslint only)", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "eslint", command: { command: "npx eslint .", source: "eslint.config.js" } },
    ];

    // eslint alone doesn't have a formatter hook
    expect(generateHooksConfig(result)).toBeNull();
  });

  it("generates valid JSON", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "prettier", command: { command: "npx prettier --check .", source: ".prettierrc" } },
    ];

    const output = generateHooksConfig(result);
    expect(() => JSON.parse(output!)).not.toThrow();
  });
});
