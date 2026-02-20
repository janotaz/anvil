import type { FileSystem } from "./index.js";
import type { CIProvider } from "./types.js";

/**
 * Detect the CI provider from workflow/config files.
 *
 * v1 supports GitHub Actions only. Checks for .github/workflows/ directory
 * containing YAML files.
 */
export async function detectCIProvider(
  projectPath: string,
  fs: FileSystem,
): Promise<CIProvider | null> {
  const workflowDir = `${projectPath}/.github/workflows`;
  const entries = await fs.readDir(workflowDir);

  const hasWorkflows = entries.some(
    (entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"),
  );

  if (hasWorkflows) {
    return "github-actions";
  }

  return null;
}
