import { describe, it, expect } from "vitest";
import { generateClaudeMd } from "../../../src/generator/claude-md.js";
import { emptyDetectionResult } from "../../../src/detector/types.js";

describe("generateClaudeMd", () => {
  it("generates basic CLAUDE.md for empty detection", () => {
    const result = emptyDetectionResult();
    const output = generateClaudeMd(result);

    expect(output).toContain("# CLAUDE.md");
    expect(output).toContain("Project-Specific Notes");
  });

  it("includes detected commands", () => {
    const result = emptyDetectionResult();
    result.installCommand = { command: "npm install", source: "npm convention" };
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };
    result.buildSystem = {
      name: "tsc",
      command: { command: "npm run build", source: "package.json scripts.build" },
    };

    const output = generateClaudeMd(result);

    expect(output).toContain("npm install");
    expect(output).toContain("npx vitest run");
    expect(output).toContain("npm run build");
    expect(output).toContain("Build & Test Commands");
  });

  it("includes linter info in code style section", () => {
    const result = emptyDetectionResult();
    result.languages = ["typescript"];
    result.linters = [
      { name: "eslint", command: { command: "npx eslint .", source: "eslint.config.js" } },
      { name: "prettier", command: { command: "npx prettier --check .", source: ".prettierrc" } },
    ];

    const output = generateClaudeMd(result);

    expect(output).toContain("ESLint for linting, Prettier for formatting");
    expect(output).toContain("TypeScript with strict mode");
  });

  it("includes MCP server docs for TS project with CI", () => {
    const result = emptyDetectionResult();
    result.languages = ["typescript"];
    result.ciProvider = "github-actions";
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };

    const output = generateClaudeMd(result);

    expect(output).toContain("memory");
    expect(output).toContain("lsmcp");
    expect(output).toContain("github");
    expect(output).toContain("coverage");
  });

  it("uses tree-sitter for Python projects", () => {
    const result = emptyDetectionResult();
    result.languages = ["python"];

    const output = generateClaudeMd(result);

    expect(output).toContain("tree-sitter");
    expect(output).not.toContain("lsmcp");
  });

  it("includes key directories when detected", () => {
    const result = emptyDetectionResult();
    result.directories = ["src", "tests", "docs"];

    const output = generateClaudeMd(result);

    expect(output).toContain("`src/`");
    expect(output).toContain("`tests/`");
    expect(output).toContain("`docs/`");
  });
});
