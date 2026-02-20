import { describe, it, expect } from "vitest";
import { generateMcpConfig } from "../../../src/generator/mcp-config.js";
import { emptyDetectionResult } from "../../../src/detector/types.js";

describe("generateMcpConfig", () => {
  it("always includes memory server", () => {
    const result = emptyDetectionResult();
    const output = generateMcpConfig(result);
    expect(output).not.toBeNull();

    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("memory");
  });

  it("includes lsmcp for TypeScript projects", () => {
    const result = emptyDetectionResult();
    result.languages = ["typescript"];
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("lsp");
    expect(servers).not.toHaveProperty("tree-sitter");
  });

  it("includes lsmcp for JavaScript projects", () => {
    const result = emptyDetectionResult();
    result.languages = ["javascript"];
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("lsp");
  });

  it("includes tree-sitter for Python projects", () => {
    const result = emptyDetectionResult();
    result.languages = ["python"];
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("tree-sitter");
    expect(servers).not.toHaveProperty("lsp");
  });

  it("includes github server when CI provider is github-actions", () => {
    const result = emptyDetectionResult();
    result.ciProvider = "github-actions";
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("github");

    const github = servers["github"] as Record<string, unknown>;
    const env = github["env"] as Record<string, string>;
    expect(env["GITHUB_TOKEN"]).toBe("${GITHUB_TOKEN}");
  });

  it("excludes github server when no CI provider", () => {
    const result = emptyDetectionResult();
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).not.toHaveProperty("github");
  });

  it("includes coverage server when test framework detected", () => {
    const result = emptyDetectionResult();
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).toHaveProperty("coverage");
  });

  it("excludes coverage server when no test framework", () => {
    const result = emptyDetectionResult();
    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(servers).not.toHaveProperty("coverage");
  });

  it("generates valid JSON", () => {
    const result = emptyDetectionResult();
    result.languages = ["typescript"];
    result.ciProvider = "github-actions";
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };

    const output = generateMcpConfig(result);
    expect(() => JSON.parse(output!)).not.toThrow();
  });

  it("includes all 4 servers for full TypeScript project", () => {
    const result = emptyDetectionResult();
    result.languages = ["typescript"];
    result.ciProvider = "github-actions";
    result.testFramework = {
      name: "vitest",
      command: { command: "npx vitest run", source: "vitest.config.ts" },
    };

    const output = generateMcpConfig(result);
    const config = JSON.parse(output!) as Record<string, unknown>;
    const servers = config["mcpServers"] as Record<string, unknown>;
    expect(Object.keys(servers)).toHaveLength(4);
    expect(servers).toHaveProperty("memory");
    expect(servers).toHaveProperty("lsp");
    expect(servers).toHaveProperty("github");
    expect(servers).toHaveProperty("coverage");
  });
});
