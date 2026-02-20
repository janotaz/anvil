# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Anvil is a scaffolder for Claude Code. It analyzes a developer's project and generates tailored configuration (CLAUDE.md, MCP servers, hooks, slash commands). No custom MCP server — it configures existing battle-tested servers.

## Build & Test Commands

```bash
npm install              # Install dependencies
npm run build            # TypeScript compilation (tsc) → dist/
npm run typecheck        # Type check without emitting (tsc --noEmit)
npm run lint             # ESLint + Prettier check
npm run lint:fix         # Auto-fix lint issues
npm run test             # Run all tests (vitest)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage    # Tests with coverage report
vitest run tests/unit/detector/language.test.ts  # Run single test file
```

## Architecture

Single npm package, CLI entry point. Two module groups:

- **Detectors** (`src/detector/`): Analyze project files to extract language, package manager, test framework, build system, CI provider, linter. Each detector reads config files through a `FileSystem` interface (no command execution). Results typed with Zod schemas in `src/detector/types.ts`. Orchestrated by `src/detector/index.ts` which runs detectors in parallel.
- **Generators** (`src/generator/`): Produce output files from detection results. CLAUDE.md (`claude-md.ts`), .mcp.json (`mcp-config.ts`), hooks (`hooks.ts`), slash commands (`slash-commands.ts`). String interpolation, no templating engine. When `--local`, MCP config and hooks are merged into a single `.claude/settings.local.json`.

CLI (`src/cli/`) uses commander for commands (`init`, `doctor`). `init` validates paths, writes with error tracking. `doctor` checks command availability via `which` and validates env vars.

## Code Standards

- Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` — every type explicit
- No floating promises — all async awaited
- Max 400 lines per file
- No console.log — use structured output for CLI
- All public functions and types have JSDoc
- Zod for runtime validation at system boundaries

## Testing

- Vitest, London School TDD for detectors and generators (mock filesystem, test behavior)
- Fixture-based for integration tests (real project directories in `tests/fixtures/`)
- No live API calls — all filesystem-based
- Target: 90%+ coverage on src/

## File Organization

- `src/cli/` — CLI entry point and commands
- `src/detector/` — Project detection logic
- `src/generator/` — Output file generation
- `tests/unit/` — Unit tests (mirror src/ structure)
- `tests/integration/` — Integration tests
- `tests/fixtures/` — Sample project directories for testing
- `docs/` — Documentation
- No files in root except config (package.json, tsconfig, etc.)

## Key Context

- See `docs/plan.md` for full implementation plan
- See `docs/assessment.md` for prior art research and ecosystem analysis
- See `docs/status.md` for current project state
- v1 supports Node.js/TypeScript + Python detection. Rust/Go in v1.1.
