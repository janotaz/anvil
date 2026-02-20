import type { FileSystem } from "./index.js";
import type { Language } from "./types.js";

/**
 * Detect primary language(s) from manifest files.
 *
 * Checks for language-specific manifest files (package.json, pyproject.toml, etc.)
 * and inspects their contents for further signals (e.g., TypeScript via tsconfig.json
 * or devDependencies).
 */
export async function detectLanguage(projectPath: string, fs: FileSystem): Promise<Language[]> {
  const languages: Language[] = [];

  // Node.js / JavaScript / TypeScript
  const hasPackageJson = await fs.exists(`${projectPath}/package.json`);
  if (hasPackageJson) {
    const hasTsConfig = await fs.exists(`${projectPath}/tsconfig.json`);
    if (hasTsConfig) {
      languages.push("typescript");
    } else {
      // Check devDependencies for typescript
      const packageJson = await fs.readFile(`${projectPath}/package.json`);
      if (packageJson !== null && hasTypescriptDep(packageJson)) {
        languages.push("typescript");
      } else {
        languages.push("javascript");
      }
    }
  }

  // Python
  const pythonSignals = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"];
  for (const signal of pythonSignals) {
    if (await fs.exists(`${projectPath}/${signal}`)) {
      languages.push("python");
      break;
    }
  }

  return languages;
}

/**
 * Check if package.json has typescript as a dependency or devDependency.
 */
function hasTypescriptDep(packageJsonContent: string): boolean {
  try {
    const parsed: unknown = JSON.parse(packageJsonContent);
    if (typeof parsed !== "object" || parsed === null) return false;

    const obj = parsed as Record<string, unknown>;
    const deps = obj["dependencies"];
    const devDeps = obj["devDependencies"];

    if (typeof deps === "object" && deps !== null && "typescript" in deps) return true;
    if (typeof devDeps === "object" && devDeps !== null && "typescript" in devDeps) return true;

    return false;
  } catch {
    return false;
  }
}
