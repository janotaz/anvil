import { describe, it, expect } from "vitest";
import { generateSlashCommands } from "../../../src/generator/slash-commands.js";
import { emptyDetectionResult } from "../../../src/detector/types.js";

describe("generateSlashCommands", () => {
  it("always generates /review command", () => {
    const result = emptyDetectionResult();
    const files = generateSlashCommands(result);

    const review = files.find((f) => f.relativePath === ".claude/commands/review.md");
    expect(review).toBeDefined();
    expect(review?.content).toContain("git diff");
    expect(review?.content).toContain("Bugs or logic errors");
  });

  it("/review includes lint commands when linters detected", () => {
    const result = emptyDetectionResult();
    result.linters = [
      { name: "eslint", command: { command: "npx eslint .", source: "eslint.config.js" } },
    ];

    const files = generateSlashCommands(result);
    const review = files.find((f) => f.relativePath === ".claude/commands/review.md");

    expect(review?.content).toContain("npx eslint .");
  });

  it("generates /test command when test framework detected", () => {
    const result = emptyDetectionResult();
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };

    const files = generateSlashCommands(result);
    const test = files.find((f) => f.relativePath === ".claude/commands/test.md");

    expect(test).toBeDefined();
    expect(test?.content).toContain("npx vitest run");
    expect(test?.content).toContain("If any tests fail");
  });

  it("does not generate /test command when no test framework", () => {
    const result = emptyDetectionResult();
    const files = generateSlashCommands(result);

    const test = files.find((f) => f.relativePath === ".claude/commands/test.md");
    expect(test).toBeUndefined();
  });

  it("generates correct file paths", () => {
    const result = emptyDetectionResult();
    result.testFramework = {
      name: "pytest",
      command: { command: "pytest", source: "pytest.ini" },
    };

    const files = generateSlashCommands(result);
    expect(files.every((f) => f.relativePath.startsWith(".claude/commands/"))).toBe(true);
    expect(files.every((f) => f.relativePath.endsWith(".md"))).toBe(true);
  });

  it("/test uses detected test command", () => {
    const result = emptyDetectionResult();
    result.testFramework = {
      name: "pytest",
      command: { command: "pytest -v", source: "pyproject.toml" },
    };

    const files = generateSlashCommands(result);
    const test = files.find((f) => f.relativePath === ".claude/commands/test.md");
    expect(test?.content).toContain("pytest -v");
  });
});
