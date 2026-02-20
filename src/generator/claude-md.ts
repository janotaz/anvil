import type { DetectionResult } from "../detector/types.js";

/**
 * Generate a CLAUDE.md file tailored to the detected project.
 *
 * Uses real commands extracted from config files, not guesses.
 */
export function generateClaudeMd(detection: DetectionResult): string {
  const sections: string[] = [];

  sections.push("# CLAUDE.md\n");
  sections.push(
    "This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.\n",
  );

  // Build & Test Commands
  const commands = buildCommandsSection(detection);
  if (commands.length > 0) {
    sections.push("## Build & Test Commands\n");
    sections.push("```bash");
    sections.push(commands.join("\n"));
    sections.push("```\n");
  }

  // Key Directories
  if (detection.directories.length > 0) {
    sections.push("## Key Directories\n");
    for (const dir of detection.directories) {
      sections.push(`- \`${dir}/\``);
    }
    sections.push("");
  }

  // Code Style
  const styleNotes = buildStyleSection(detection);
  if (styleNotes.length > 0) {
    sections.push("## Code Style\n");
    sections.push(styleNotes.join("\n"));
    sections.push("");
  }

  // MCP Servers
  const mcpNotes = buildMcpSection(detection);
  if (mcpNotes.length > 0) {
    sections.push("## MCP Servers Available\n");
    sections.push(
      "This project is configured with the following MCP servers (see .mcp.json):\n",
    );
    sections.push(mcpNotes.join("\n"));
    sections.push("");
  }

  // Project-Specific Notes
  sections.push("## Project-Specific Notes\n");
  sections.push("<!-- Add project-specific context here: domain knowledge, gotchas, conventions -->");
  sections.push("");

  return sections.join("\n");
}

function buildCommandsSection(detection: DetectionResult): string[] {
  const commands: string[] = [];

  if (detection.installCommand !== null) {
    commands.push(padCommand(detection.installCommand.command, "Install dependencies"));
  }

  if (detection.buildSystem !== null) {
    commands.push(padCommand(detection.buildSystem.command.command, "Build project"));
  }

  if (detection.testFramework !== null) {
    commands.push(padCommand(detection.testFramework.command.command, "Run tests"));
  }

  for (const linter of detection.linters) {
    const label = linter.name === "prettier" ? "Format check" : "Lint code";
    commands.push(padCommand(linter.command.command, label));
  }

  return commands;
}

function padCommand(command: string, description: string): string {
  const padding = Math.max(1, 30 - command.length);
  return `${command}${" ".repeat(padding)}# ${description}`;
}

function buildStyleSection(detection: DetectionResult): string[] {
  const notes: string[] = [];
  const linterNames = detection.linters.map((l) => l.name);

  if (linterNames.includes("eslint") && linterNames.includes("prettier")) {
    notes.push("- ESLint for linting, Prettier for formatting");
  } else if (linterNames.includes("biome")) {
    notes.push("- Biome for linting and formatting");
  } else if (linterNames.includes("eslint")) {
    notes.push("- ESLint for linting");
  }

  if (linterNames.includes("ruff")) {
    notes.push("- Ruff for linting and formatting");
  }
  if (linterNames.includes("black")) {
    notes.push("- Black for formatting");
  }
  if (linterNames.includes("mypy")) {
    notes.push("- Mypy for type checking");
  }
  if (linterNames.includes("flake8") && !linterNames.includes("ruff")) {
    notes.push("- Flake8 for linting");
  }

  if (detection.languages.includes("typescript")) {
    notes.push("- TypeScript with strict mode");
  }

  return notes;
}

function buildMcpSection(detection: DetectionResult): string[] {
  const notes: string[] = [];

  notes.push("- **memory** — Cross-session context via mcp-memory-service (semantic search)");

  const hasTs =
    detection.languages.includes("typescript") ||
    detection.languages.includes("javascript");
  const hasPython = detection.languages.includes("python");

  if (hasTs) {
    notes.push("- **lsp** — Code intelligence via lsmcp (go-to-definition, find references, rename)");
  }
  if (hasPython) {
    notes.push("- **tree-sitter** — Code intelligence via mcp-server-tree-sitter (AST analysis, symbols)");
  }
  if (!hasTs && !hasPython) {
    notes.push("- **tree-sitter** — Code intelligence via mcp-server-tree-sitter (AST analysis, symbols)");
  }

  if (detection.ciProvider !== null) {
    notes.push("- **github** — GitHub integration via github-mcp-server (PRs, issues, Actions)");
  }

  if (detection.testFramework !== null) {
    notes.push("- **coverage** — Test coverage tracking via test-coverage-mcp");
  }

  return notes;
}
