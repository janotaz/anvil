import type { FileSystem } from "./index.js";
import type { DetectedCommand, Linter } from "./types.js";

interface LinterResult {
  name: Linter;
  command: DetectedCommand;
}

/**
 * Detect linters and formatters from config files and package.json scripts.
 *
 * Returns all detected linters (a project can have multiple, e.g., ESLint + Prettier).
 */
export async function detectLinters(
  projectPath: string,
  fs: FileSystem,
): Promise<LinterResult[]> {
  const results: LinterResult[] = [];

  // Node.js linters
  const nodeResults = await detectNodeLinters(projectPath, fs);
  results.push(...nodeResults);

  // Python linters
  const pythonResults = await detectPythonLinters(projectPath, fs);
  results.push(...pythonResults);

  return results;
}

async function detectNodeLinters(
  projectPath: string,
  fs: FileSystem,
): Promise<LinterResult[]> {
  const results: LinterResult[] = [];

  // Biome (check first — if biome is present, it replaces eslint+prettier)
  const biomeConfigs = ["biome.json", "biome.jsonc"];
  for (const config of biomeConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      results.push({
        name: "biome",
        command: { command: "npx biome check .", source: config },
      });
      return results; // Biome replaces both eslint and prettier
    }
  }

  // ESLint
  const eslintConfigs = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.yml",
    ".eslintrc.yaml",
  ];
  for (const config of eslintConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      results.push({
        name: "eslint",
        command: { command: "npx eslint .", source: config },
      });
      break;
    }
  }

  // Prettier
  const prettierConfigs = [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.yml",
    ".prettierrc.yaml",
    ".prettierrc.js",
    ".prettierrc.mjs",
    "prettier.config.js",
    "prettier.config.mjs",
  ];
  for (const config of prettierConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      results.push({
        name: "prettier",
        command: { command: "npx prettier --check .", source: config },
      });
      break;
    }
  }

  return results;
}

async function detectPythonLinters(
  projectPath: string,
  fs: FileSystem,
): Promise<LinterResult[]> {
  const results: LinterResult[] = [];
  const pyprojectContent = await fs.readFile(`${projectPath}/pyproject.toml`);

  // Ruff (check first — ruff replaces flake8+black in many projects)
  if (await fs.exists(`${projectPath}/ruff.toml`)) {
    results.push({
      name: "ruff",
      command: { command: "ruff check .", source: "ruff.toml" },
    });
  } else if (pyprojectContent !== null && pyprojectContent.includes("[tool.ruff]")) {
    results.push({
      name: "ruff",
      command: { command: "ruff check .", source: "pyproject.toml [tool.ruff]" },
    });
  }

  // Black
  if (pyprojectContent !== null && pyprojectContent.includes("[tool.black]")) {
    results.push({
      name: "black",
      command: { command: "black --check .", source: "pyproject.toml [tool.black]" },
    });
  }

  // Flake8
  if (await fs.exists(`${projectPath}/.flake8`)) {
    results.push({
      name: "flake8",
      command: { command: "flake8 .", source: ".flake8" },
    });
  } else if (
    (await fs.exists(`${projectPath}/setup.cfg`)) &&
    ((await fs.readFile(`${projectPath}/setup.cfg`)) ?? "").includes("[flake8]")
  ) {
    results.push({
      name: "flake8",
      command: { command: "flake8 .", source: "setup.cfg [flake8]" },
    });
  }

  // Mypy
  if (pyprojectContent !== null && pyprojectContent.includes("[tool.mypy]")) {
    results.push({
      name: "mypy",
      command: { command: "mypy .", source: "pyproject.toml [tool.mypy]" },
    });
  } else if (await fs.exists(`${projectPath}/mypy.ini`)) {
    results.push({
      name: "mypy",
      command: { command: "mypy .", source: "mypy.ini" },
    });
  }

  return results;
}
