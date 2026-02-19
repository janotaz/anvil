# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
vitest run tests/unit/memory/store.test.ts  # Run single test file
```

## Architecture

Single npm package, single MCP server entry point. Three tool groups:

- **Memory tools** (`src/tools/memory.ts`): Persistent cross-session storage with semantic search. Backend is SQLite (`src/memory/store.ts`) + local ONNX embeddings (`src/memory/embeddings.ts`).
- **Codebase tools** (`src/tools/codebase.ts`): Structural repo understanding via tree-sitter. Parser in `src/indexer/parser.ts`, dependency graph in `src/indexer/graph.ts`.
- **CI tools** (`src/tools/ci.ts`): GitHub Actions integration. API client in `src/ci/github-actions.ts`, log/coverage parsers in `src/ci/parsers.ts`.

MCP server (`src/server.ts`) handles JSON-RPC 2.0 over stdio. Tools registered in `src/tools/index.ts`.

## Code Standards

- Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` — every type explicit
- No floating promises — all async awaited
- Max 400 lines per file
- No console.log — use structured logging
- All public functions and types have JSDoc
- Zod for runtime validation at system boundaries

## Testing

- Vitest, London School TDD for tool handlers (mock deps, test behavior)
- Chicago School for data layer (real SQLite, real tree-sitter)
- Recorded HTTP fixtures for CI tests (no live API calls)
- Target: 90%+ coverage on src/
- Test files mirror src/ structure under tests/unit/ and tests/integration/

## File Organization

- `src/` — All source code
- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests
- `tests/fixtures/` — Test data (sample repos, recorded API responses)
- `docs/` — Documentation
- No files in root except config (package.json, tsconfig, etc.)
