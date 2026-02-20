import { z } from "zod";

/** Supported primary languages for v1 detection. */
export const LanguageSchema = z.enum(["typescript", "javascript", "python"]);
export type Language = z.infer<typeof LanguageSchema>;

/** Package managers we can detect. */
export const PackageManagerSchema = z.enum([
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "pip",
  "poetry",
  "uv",
  "pipenv",
]);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

/** Test frameworks we can detect. */
export const TestFrameworkSchema = z.enum([
  "vitest",
  "jest",
  "mocha",
  "pytest",
  "unittest",
]);
export type TestFramework = z.infer<typeof TestFrameworkSchema>;

/** Build systems we can detect. */
export const BuildSystemSchema = z.enum([
  "tsc",
  "vite",
  "webpack",
  "esbuild",
  "rollup",
  "setuptools",
  "hatch",
  "maturin",
]);
export type BuildSystem = z.infer<typeof BuildSystemSchema>;

/** CI providers we can detect. */
export const CIProviderSchema = z.enum(["github-actions"]);
export type CIProvider = z.infer<typeof CIProviderSchema>;

/** Linters and formatters we can detect. */
export const LinterSchema = z.enum([
  "eslint",
  "prettier",
  "biome",
  "ruff",
  "black",
  "flake8",
  "mypy",
]);
export type Linter = z.infer<typeof LinterSchema>;

/** A detected command extracted from project config. */
export const DetectedCommandSchema = z.object({
  /** The command string (e.g., "vitest run", "pytest"). */
  command: z.string(),
  /** Where this was detected from (e.g., "package.json scripts.test"). */
  source: z.string(),
});
export type DetectedCommand = z.infer<typeof DetectedCommandSchema>;

/** Result from a single detector. Nullable fields mean "not detected". */
export const DetectionResultSchema = z.object({
  /** Primary language(s) detected. */
  languages: z.array(LanguageSchema),
  /** Detected package manager. */
  packageManager: PackageManagerSchema.nullable(),
  /** Detected test framework and its run command. */
  testFramework: z
    .object({
      name: TestFrameworkSchema,
      command: DetectedCommandSchema,
    })
    .nullable(),
  /** Detected build system and its run command. */
  buildSystem: z
    .object({
      name: BuildSystemSchema,
      command: DetectedCommandSchema,
    })
    .nullable(),
  /** Detected CI provider. */
  ciProvider: CIProviderSchema.nullable(),
  /** Detected linters/formatters and their run commands. */
  linters: z.array(
    z.object({
      name: LinterSchema,
      command: DetectedCommandSchema,
    }),
  ),
  /** Whether this is a monorepo. */
  isMonorepo: z.boolean(),
  /** Install command (e.g., "npm install", "poetry install"). */
  installCommand: DetectedCommandSchema.nullable(),
  /** Key directories found in the project root. */
  directories: z.array(z.string()),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

/** Create an empty detection result as a starting point. */
export function emptyDetectionResult(): DetectionResult {
  return {
    languages: [],
    packageManager: null,
    testFramework: null,
    buildSystem: null,
    ciProvider: null,
    linters: [],
    isMonorepo: false,
    installCommand: null,
    directories: [],
  };
}
