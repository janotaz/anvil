# Anvil - Project Status

## What Anvil Is

Anvil is a **scaffolder for Claude Code**. It analyzes your project and generates tailored configuration so Claude Code works well out of the box.

```bash
npx anvil init
```

This generates:
- **CLAUDE.md** with your actual build/test/lint commands
- **.mcp.json** configuring proven MCP servers (memory, codebase intelligence, CI, coverage)
- **Hooks** for auto-formatting, lint checks, and dangerous command blocking
- **Slash commands** for common workflows

Plus `anvil doctor` to validate everything is configured correctly.

## How We Got Here

Anvil was originally planned as a full MCP server implementing memory, codebase intelligence, and CI/CD tools from scratch. After evaluating the MCP ecosystem in February 2026 (see `docs/assessment.md`), we found that:

- **Memory:** mcp-memory-service (1.4k stars) does hybrid BM25+vector search with local ONNX embeddings
- **Codebase:** lsmcp (439 stars) provides real LSP-based intelligence; mcp-server-tree-sitter (264 stars) covers AST analysis
- **CI/CD:** github-mcp-server (27k stars, official) handles Actions; test-coverage-mcp handles LCOV
- Every individual feature had production-ready implementations

Building from scratch would mean reimplementing commodity features and competing against official servers from Anthropic and GitHub. Instead, Anvil pivoted to configuring the best existing servers.

## Current State (as of 2026-02-20)

**Planning complete. Implementation not started.**

What exists:
- `README.md` — Project overview (rewritten for scaffolder direction)
- `CLAUDE.md` — Claude Code development guidance
- `docs/assessment.md` — claude-flow audit + MCP ecosystem analysis
- `docs/plan.md` — Implementation plan (rewritten for scaffolder architecture)
- `docs/status.md` — This file

What doesn't exist yet:
- No `package.json`, `tsconfig.json`, or config files
- No source code (`src/`)
- No tests (`tests/`)

## Next Step

**Phase 1: Foundation** — Scaffold the project (package.json, tsconfig, eslint, vitest), create CLI skeleton with commander, define Zod schemas for detection results.

## Tech Stack

TypeScript (strict), Node.js 20+, commander, enquirer, Zod, Vitest, ESLint 9 + Prettier.

Notably absent (delegated to existing servers): better-sqlite3, tree-sitter, ONNX, Octokit, MCP SDK.

## Implementation Phases

1. **Foundation** — Scaffold, CLI skeleton, Zod schemas
2. **Detectors (Node.js/TS)** — Language, package manager, test, build, CI, linter detection
3. **Detectors (Python)** — Same detectors for Python ecosystem
4. **Generators** — CLAUDE.md, .mcp.json, hooks, slash commands
5. **CLI Polish** — Interactive mode, --dry-run, --force, anvil doctor
6. **Publish** — npm publish workflow, final docs
