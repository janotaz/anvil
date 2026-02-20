import * as fs from "node:fs";
import * as path from "node:path";
import { detectProject, type FileSystem } from "../../detector/index.js";
import { generateAll, type GeneratedFile } from "../../generator/index.js";

interface InitOptions {
  local?: boolean;
  dryRun?: boolean;
  force?: boolean;
  path?: string;
}

/** Real filesystem implementation. */
const realFs: FileSystem = {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  },
  async readDir(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch {
      return [];
    }
  },
};

/**
 * Handler for the `anvil init` command.
 *
 * Detects project characteristics and generates Claude Code configuration files.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const log = console.log.bind(console); // eslint-disable-line no-console
  const logError = console.error.bind(console); // eslint-disable-line no-console

  const projectPath = path.resolve(options.path ?? process.cwd());

  // Verify the project directory exists
  try {
    const stat = await fs.promises.stat(projectPath);
    if (!stat.isDirectory()) {
      logError(`Error: ${projectPath} is not a directory.`);
      process.exitCode = 1;
      return;
    }
  } catch {
    logError(`Error: Directory not found: ${projectPath}`);
    process.exitCode = 1;
    return;
  }

  log(`Analyzing project at ${projectPath}...\n`);

  const detection = await detectProject(projectPath, realFs);

  // Report what was detected
  printDetectionSummary(detection);

  // Generate files
  const files = generateAll(detection, { local: options.local === true });

  if (options.dryRun === true) {
    printDryRun(files);
    return;
  }

  // Write files
  const { written, skipped, errors } = await writeFiles(projectPath, files, options.force === true);

  if (errors > 0) {
    logError(`\n${String(errors)} file(s) failed to write.`);
    process.exitCode = 1;
  } else if (written === 0 && skipped > 0) {
    log(`\nAll ${String(skipped)} file(s) already exist. Use --force to overwrite.`);
  } else {
    log("\nDone. Review the generated files and customize as needed.");
  }
}

function printDetectionSummary(
  detection: Awaited<ReturnType<typeof detectProject>>,
): void {
  const log = console.log.bind(console); // eslint-disable-line no-console
  log("Detected:");

  if (detection.languages.length > 0) {
    log(`  Languages:       ${detection.languages.join(", ")}`);
  }
  if (detection.packageManager !== null) {
    log(`  Package manager: ${detection.packageManager}`);
  }
  if (detection.testFramework !== null) {
    log(`  Test framework:  ${detection.testFramework.name}`);
  }
  if (detection.buildSystem !== null) {
    log(`  Build system:    ${detection.buildSystem.name}`);
  }
  if (detection.ciProvider !== null) {
    log(`  CI provider:     ${detection.ciProvider}`);
  }
  if (detection.linters.length > 0) {
    log(`  Linters:         ${detection.linters.map((l) => l.name).join(", ")}`);
  }
  if (detection.isMonorepo) {
    log(`  Monorepo:        yes`);
  }
  if (detection.directories.length > 0) {
    log(`  Directories:     ${detection.directories.join(", ")}`);
  }

  log("");
}

function printDryRun(files: GeneratedFile[]): void {
  const log = console.log.bind(console); // eslint-disable-line no-console
  log("Dry run — would generate the following files:\n");

  for (const file of files) {
    log(`--- ${file.relativePath} ---`);
    log(file.content);
  }
}

interface WriteResult {
  written: number;
  skipped: number;
  errors: number;
}

async function writeFiles(
  projectPath: string,
  files: GeneratedFile[],
  force: boolean,
): Promise<WriteResult> {
  const log = console.log.bind(console); // eslint-disable-line no-console
  const logError = console.error.bind(console); // eslint-disable-line no-console
  const result: WriteResult = { written: 0, skipped: 0, errors: 0 };

  // Validate all paths are safe before writing anything
  for (const file of files) {
    const resolved = path.resolve(projectPath, file.relativePath);
    if (!resolved.startsWith(projectPath + path.sep) && resolved !== projectPath) {
      logError(`  Error: ${file.relativePath} resolves outside project directory. Skipping.`);
      result.errors++;
      return result;
    }
  }

  for (const file of files) {
    const fullPath = path.join(projectPath, file.relativePath);
    const dir = path.dirname(fullPath);

    // Check for existing files
    if (!force) {
      try {
        await fs.promises.access(fullPath);
        log(`  Skipped ${file.relativePath} (already exists, use --force to overwrite)`);
        result.skipped++;
        continue;
      } catch {
        // File doesn't exist, proceed
      }
    }

    try {
      // Ensure directory exists
      await fs.promises.mkdir(dir, { recursive: true });

      // Write file
      await fs.promises.writeFile(fullPath, file.content, "utf-8");
      log(`  Created ${file.relativePath}`);
      result.written++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logError(`  Error writing ${file.relativePath}: ${message}`);
      result.errors++;
    }
  }

  return result;
}
