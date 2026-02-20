import type { FileSystem } from "./index.js";
import type { DetectedCommand, TestFramework } from "./types.js";

interface TestFrameworkResult {
  name: TestFramework;
  command: DetectedCommand;
}

/**
 * Detect the test framework from config files and package.json scripts.
 *
 * Strategy:
 * 1. Check for framework-specific config files (most reliable).
 * 2. Parse package.json scripts for test commands.
 * 3. Check pyproject.toml for pytest configuration.
 */
export async function detectTestFramework(
  projectPath: string,
  fs: FileSystem,
): Promise<TestFrameworkResult | null> {
  // Check Node.js test frameworks via config files
  const nodeResult = await detectNodeTestFramework(projectPath, fs);
  if (nodeResult !== null) return nodeResult;

  // Check Python test frameworks
  const pythonResult = await detectPythonTestFramework(projectPath, fs);
  if (pythonResult !== null) return pythonResult;

  return null;
}

async function detectNodeTestFramework(
  projectPath: string,
  fs: FileSystem,
): Promise<TestFrameworkResult | null> {
  // Vitest: config file takes precedence
  const vitestConfigs = [
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mts",
    "vitest.config.mjs",
  ];
  for (const config of vitestConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "vitest",
        command: { command: "npx vitest run", source: config },
      };
    }
  }

  // Jest: config file
  const jestConfigs = ["jest.config.ts", "jest.config.js", "jest.config.mjs"];
  for (const config of jestConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "jest",
        command: { command: "npx jest", source: config },
      };
    }
  }

  // Mocha: config file
  const mochaConfigs = [".mocharc.yml", ".mocharc.yaml", ".mocharc.json", ".mocharc.js"];
  for (const config of mochaConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "mocha",
        command: { command: "npx mocha", source: config },
      };
    }
  }

  // Fallback: parse package.json scripts
  const packageJson = await fs.readFile(`${projectPath}/package.json`);
  if (packageJson !== null) {
    return detectFromPackageJsonScripts(packageJson);
  }

  return null;
}

function detectFromPackageJsonScripts(packageJsonContent: string): TestFrameworkResult | null {
  try {
    const parsed: unknown = JSON.parse(packageJsonContent);
    if (typeof parsed !== "object" || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    const scripts = obj["scripts"];
    if (typeof scripts !== "object" || scripts === null) return null;

    const scriptObj = scripts as Record<string, unknown>;
    const testScript = scriptObj["test"];
    if (typeof testScript !== "string") return null;

    if (testScript.includes("vitest")) {
      return {
        name: "vitest",
        command: { command: "npm test", source: "package.json scripts.test" },
      };
    }
    if (testScript.includes("jest")) {
      return {
        name: "jest",
        command: { command: "npm test", source: "package.json scripts.test" },
      };
    }
    if (testScript.includes("mocha")) {
      return {
        name: "mocha",
        command: { command: "npm test", source: "package.json scripts.test" },
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function detectPythonTestFramework(
  projectPath: string,
  fs: FileSystem,
): Promise<TestFrameworkResult | null> {
  // pytest.ini or conftest.py
  if (await fs.exists(`${projectPath}/pytest.ini`)) {
    return {
      name: "pytest",
      command: { command: "pytest", source: "pytest.ini" },
    };
  }
  if (await fs.exists(`${projectPath}/conftest.py`)) {
    return {
      name: "pytest",
      command: { command: "pytest", source: "conftest.py" },
    };
  }

  // pyproject.toml [tool.pytest]
  const pyprojectContent = await fs.readFile(`${projectPath}/pyproject.toml`);
  if (pyprojectContent !== null) {
    if (pyprojectContent.includes("[tool.pytest")) {
      return {
        name: "pytest",
        command: { command: "pytest", source: "pyproject.toml [tool.pytest]" },
      };
    }
  }

  // setup.cfg [tool:pytest]
  const setupCfg = await fs.readFile(`${projectPath}/setup.cfg`);
  if (setupCfg !== null && setupCfg.includes("[tool:pytest]")) {
    return {
      name: "pytest",
      command: { command: "pytest", source: "setup.cfg [tool:pytest]" },
    };
  }

  return null;
}
