# Anvil - Project Status

## Current State (2026-02-20)

**Phases 1-5 complete. Ready for npm publish.**

### What's Built

- **7 detectors**: language, package manager, test framework, build system, CI provider, linter, monorepo
- **4 generators**: CLAUDE.md, .mcp.json, hooks config, slash commands
- **2 CLI commands**: `anvil init`, `anvil doctor`
- **152 tests** across 14 test files (unit + integration)
- **5 fixture projects**: node-ts, python (uv), poetry, setuptools, empty

### Supported Ecosystems

| | Node.js/TypeScript | Python |
|---|---|---|
| Package managers | npm, yarn, pnpm, bun | pip, poetry, uv, pipenv |
| Test frameworks | vitest, jest, mocha | pytest, unittest |
| Build systems | tsc, vite, webpack, esbuild, rollup | setuptools, hatch, maturin |
| Linters | eslint, prettier, biome | ruff, black, flake8, mypy |
| CI | GitHub Actions | GitHub Actions |

### Key Design Decisions Made

1. **Scaffolder, not MCP server** — existing servers are better than anything we'd build
2. **Parse config files, don't execute commands** — read package.json, pyproject.toml, etc.
3. **MCP + hooks merge** — when `--local`, both go into single `.claude/settings.local.json`
4. **Mixed-language support** — TS+Python projects get both lsmcp and tree-sitter
5. **unittest detection** — via setup.cfg `[unittest]` section or test_*.py file discovery

### Architecture

```
src/
├── cli/          # Commander CLI: init + doctor
├── detector/     # 7 detectors + FileSystem interface + Zod schemas
├── generator/    # CLAUDE.md, .mcp.json, hooks, slash commands
└── index.ts      # Public API exports
```

## Remaining Work

- **Interactive mode** — enquirer prompts when detection is ambiguous (deferred, not blocking)
- **npm publish** — GitHub Actions release workflow
- **Rust/Go detection** — v1.1 scope
- **GitLab CI, CircleCI** — v1.1 scope
