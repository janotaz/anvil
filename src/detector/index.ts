import { type DetectionResult, emptyDetectionResult } from "./types.js";
import { detectLanguage } from "./language.js";
import { detectPackageManager } from "./package-manager.js";
import { detectTestFramework } from "./test-framework.js";
import { detectBuildSystem } from "./build-system.js";
import { detectCIProvider } from "./ci-provider.js";
import { detectLinters } from "./linter.js";

/**
 * Filesystem abstraction for testing. Detectors read files through this
 * interface so tests can provide fixture data without touching the real FS.
 */
export interface FileSystem {
  /** Check if a file or directory exists at the given path. */
  exists(path: string): Promise<boolean>;
  /** Read a file as UTF-8 text. Returns null if the file doesn't exist. */
  readFile(path: string): Promise<string | null>;
  /** List entries in a directory. Returns empty array if directory doesn't exist. */
  readDir(path: string): Promise<string[]>;
}

/**
 * Run all detectors against a project directory and return a unified result.
 *
 * @param projectPath - Absolute path to the project root.
 * @param fs - Filesystem implementation (real or mock).
 */
export async function detectProject(
  projectPath: string,
  fs: FileSystem,
): Promise<DetectionResult> {
  const result = emptyDetectionResult();

  // Run independent detectors in parallel
  const [languages, packageManager, testFramework, buildSystem, ciProvider, linters, directories] =
    await Promise.all([
      detectLanguage(projectPath, fs),
      detectPackageManager(projectPath, fs),
      detectTestFramework(projectPath, fs),
      detectBuildSystem(projectPath, fs),
      detectCIProvider(projectPath, fs),
      detectLinters(projectPath, fs),
      detectDirectories(projectPath, fs),
    ]);

  result.languages = languages;
  result.packageManager = packageManager;
  result.testFramework = testFramework;
  result.buildSystem = buildSystem;
  result.ciProvider = ciProvider;
  result.linters = linters;
  result.directories = directories;
  result.isMonorepo = await detectMonorepo(projectPath, fs);
  result.installCommand = deriveInstallCommand(packageManager);

  return result;
}

/**
 * Detect key directories in the project root.
 */
async function detectDirectories(projectPath: string, fs: FileSystem): Promise<string[]> {
  const entries = await fs.readDir(projectPath);
  const interestingDirs = [
    "src",
    "lib",
    "app",
    "pages",
    "components",
    "tests",
    "test",
    "__tests__",
    "spec",
    "docs",
    "scripts",
    "public",
    "static",
    "assets",
    "config",
    "utils",
    "helpers",
  ];
  return entries.filter((entry) => interestingDirs.includes(entry));
}

/**
 * Detect whether the project is a monorepo.
 */
async function detectMonorepo(projectPath: string, fs: FileSystem): Promise<boolean> {
  const monorepoSignals = [
    "pnpm-workspace.yaml",
    "nx.json",
    "turbo.json",
    "lerna.json",
    "rush.json",
  ];

  for (const signal of monorepoSignals) {
    if (await fs.exists(`${projectPath}/${signal}`)) {
      return true;
    }
  }

  // Check for workspaces in package.json
  const packageJson = await fs.readFile(`${projectPath}/package.json`);
  if (packageJson !== null) {
    try {
      const parsed: unknown = JSON.parse(packageJson);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "workspaces" in parsed
      ) {
        return true;
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return false;
}

/**
 * Derive the install command from the detected package manager.
 */
function deriveInstallCommand(
  packageManager: DetectionResult["packageManager"],
): DetectionResult["installCommand"] {
  if (packageManager === null) return null;

  const commands: Record<string, string> = {
    npm: "npm install",
    yarn: "yarn install",
    pnpm: "pnpm install",
    bun: "bun install",
    pip: "pip install -r requirements.txt",
    poetry: "poetry install",
    uv: "uv sync",
    pipenv: "pipenv install",
  };

  const command = commands[packageManager];
  if (command === undefined) return null;

  return { command, source: `${packageManager} convention` };
}
