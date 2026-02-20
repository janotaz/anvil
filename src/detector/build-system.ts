import type { FileSystem } from "./index.js";
import type { BuildSystem, DetectedCommand } from "./types.js";

interface BuildSystemResult {
  name: BuildSystem;
  command: DetectedCommand;
}

/**
 * Detect the build system from config files and package.json scripts.
 *
 * Strategy:
 * 1. Check for build-tool-specific config files.
 * 2. Parse package.json scripts.build for build commands.
 * 3. Check Python build system in pyproject.toml.
 */
export async function detectBuildSystem(
  projectPath: string,
  fs: FileSystem,
): Promise<BuildSystemResult | null> {
  const nodeResult = await detectNodeBuildSystem(projectPath, fs);
  if (nodeResult !== null) return nodeResult;

  const pythonResult = await detectPythonBuildSystem(projectPath, fs);
  if (pythonResult !== null) return pythonResult;

  return null;
}

async function detectNodeBuildSystem(
  projectPath: string,
  fs: FileSystem,
): Promise<BuildSystemResult | null> {
  // Vite
  const viteConfigs = ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"];
  for (const config of viteConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "vite",
        command: { command: "npx vite build", source: config },
      };
    }
  }

  // Webpack
  const webpackConfigs = ["webpack.config.ts", "webpack.config.js", "webpack.config.mjs"];
  for (const config of webpackConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "webpack",
        command: { command: "npx webpack", source: config },
      };
    }
  }

  // Rollup
  const rollupConfigs = ["rollup.config.ts", "rollup.config.js", "rollup.config.mjs"];
  for (const config of rollupConfigs) {
    if (await fs.exists(`${projectPath}/${config}`)) {
      return {
        name: "rollup",
        command: { command: "npx rollup -c", source: config },
      };
    }
  }

  // Parse package.json for build script
  const packageJson = await fs.readFile(`${projectPath}/package.json`);
  if (packageJson !== null) {
    const fromScripts = detectFromBuildScript(packageJson);
    if (fromScripts !== null) return fromScripts;
  }

  // tsc: fallback if tsconfig.json exists and no other build tool found
  if (await fs.exists(`${projectPath}/tsconfig.json`)) {
    return {
      name: "tsc",
      command: { command: "npx tsc", source: "tsconfig.json" },
    };
  }

  return null;
}

function detectFromBuildScript(packageJsonContent: string): BuildSystemResult | null {
  try {
    const parsed: unknown = JSON.parse(packageJsonContent);
    if (typeof parsed !== "object" || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    const scripts = obj["scripts"];
    if (typeof scripts !== "object" || scripts === null) return null;

    const scriptObj = scripts as Record<string, unknown>;
    const buildScript = scriptObj["build"];
    if (typeof buildScript !== "string") return null;

    if (buildScript.includes("vite")) {
      return {
        name: "vite",
        command: { command: "npm run build", source: "package.json scripts.build" },
      };
    }
    if (buildScript.includes("webpack")) {
      return {
        name: "webpack",
        command: { command: "npm run build", source: "package.json scripts.build" },
      };
    }
    if (buildScript.includes("esbuild")) {
      return {
        name: "esbuild",
        command: { command: "npm run build", source: "package.json scripts.build" },
      };
    }
    if (buildScript.includes("rollup")) {
      return {
        name: "rollup",
        command: { command: "npm run build", source: "package.json scripts.build" },
      };
    }
    if (buildScript.includes("tsc")) {
      return {
        name: "tsc",
        command: { command: "npm run build", source: "package.json scripts.build" },
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function detectPythonBuildSystem(
  projectPath: string,
  fs: FileSystem,
): Promise<BuildSystemResult | null> {
  const pyprojectContent = await fs.readFile(`${projectPath}/pyproject.toml`);
  if (pyprojectContent === null) {
    // setup.py → setuptools
    if (await fs.exists(`${projectPath}/setup.py`)) {
      return {
        name: "setuptools",
        command: { command: "python -m build", source: "setup.py" },
      };
    }
    return null;
  }

  if (pyprojectContent.includes("[tool.hatch]") || pyprojectContent.includes("hatchling")) {
    return {
      name: "hatch",
      command: { command: "hatch build", source: "pyproject.toml [tool.hatch]" },
    };
  }

  if (pyprojectContent.includes("[tool.maturin]") || pyprojectContent.includes("maturin")) {
    return {
      name: "maturin",
      command: { command: "maturin build", source: "pyproject.toml [tool.maturin]" },
    };
  }

  if (
    pyprojectContent.includes("setuptools") ||
    (await fs.exists(`${projectPath}/setup.py`))
  ) {
    return {
      name: "setuptools",
      command: { command: "python -m build", source: "pyproject.toml" },
    };
  }

  return null;
}
