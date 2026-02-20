import type { DetectionResult } from "../detector/types.js";
import type { GeneratedFile } from "./index.js";

/**
 * Generate Claude Code slash command files for common workflows.
 *
 * Slash commands are markdown files in .claude/commands/ that define
 * reusable prompts invoked via /command-name in Claude Code.
 */
export function generateSlashCommands(detection: DetectionResult): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // /review command — always useful
  files.push({
    relativePath: ".claude/commands/review.md",
    content: buildReviewCommand(detection),
  });

  // /test command — only if test framework detected
  if (detection.testFramework !== null) {
    files.push({
      relativePath: ".claude/commands/test.md",
      content: buildTestCommand(detection),
    });
  }

  return files;
}

function buildReviewCommand(detection: DetectionResult): string {
  const lines: string[] = [];

  lines.push("Review the changes in the current branch compared to main.");
  lines.push("");
  lines.push("1. Run `git diff main...HEAD` to see all changes.");
  lines.push("2. For each changed file, check for:");
  lines.push("   - Bugs or logic errors");
  lines.push("   - Missing error handling");
  lines.push("   - Security concerns");
  lines.push("   - Test coverage gaps");

  if (detection.linters.length > 0) {
    const lintCommands = detection.linters
      .map((l) => `\`${l.command.command}\``)
      .join(" and ");
    lines.push(`3. Run ${lintCommands} and report any issues.`);
  }

  lines.push("");
  lines.push("Provide a concise summary of findings with file:line references.");

  return lines.join("\n") + "\n";
}

function buildTestCommand(detection: DetectionResult): string {
  const lines: string[] = [];

  if (detection.testFramework === null) return "";

  lines.push(
    `Run the test suite with \`${detection.testFramework.command.command}\` and report results.`,
  );
  lines.push("");
  lines.push("If any tests fail:");
  lines.push("1. Show the failure output.");
  lines.push("2. Identify the likely cause.");
  lines.push("3. Suggest a fix.");
  lines.push("");
  lines.push("If all tests pass, report the summary (pass count, duration).");

  return lines.join("\n") + "\n";
}
