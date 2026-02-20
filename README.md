# Anvil

A scaffolder for Claude Code. Analyzes your project and generates tailored configuration — CLAUDE.md, MCP servers, hooks, and slash commands — so Claude Code works well out of the box.

## What It Does

```bash
npx anvil init
```

Anvil inspects your project and generates:

- **CLAUDE.md** with your actual build, test, and lint commands
- **.mcp.json** configuring proven MCP servers for memory, codebase intelligence, CI, and coverage
- **Hooks** for auto-formatting, lint checks, and dangerous command blocking
- **Slash commands** for common workflows (review, test, etc.)

Plus `anvil doctor` to validate that everything is configured correctly.

## Why

Claude Code is capable out of the box, but setting it up well for a specific project takes work:

1. Writing a good CLAUDE.md requires knowing what matters (commands, architecture, conventions).
2. The MCP ecosystem has dozens of servers — choosing the right ones and configuring them is friction.
3. Hooks and slash commands are powerful but most developers don't set them up.

Anvil does the setup work. It doesn't build new AI capabilities — it configures the best existing ones.

## MCP Servers Anvil Configures

Anvil selects from battle-tested MCP servers based on your project:

| Capability | Server | Why |
|------------|--------|-----|
| Cross-session memory | [mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | Hybrid BM25+vector search, local ONNX embeddings, SQLite, 1.4k stars |
| Codebase intelligence | [lsmcp](https://github.com/mizchi/lsmcp) (TS/Go/Rust) or [mcp-server-tree-sitter](https://github.com/wrale/mcp-server-tree-sitter) | Real LSP or tree-sitter AST analysis |
| GitHub integration | [github-mcp-server](https://github.com/github/github-mcp-server) | Official GitHub server, 27k stars, Actions support |
| Test coverage | [test-coverage-mcp](https://github.com/goldbergyoni/test-coverage-mcp) | LCOV parsing, diff-from-baseline tracking |

## What Anvil Detects

Anvil parses your config files to extract real information (not guesses):

- **Language**: Node.js/TypeScript, Python (v1). Rust, Go planned.
- **Package manager**: npm, yarn, pnpm, bun, pip, poetry, uv
- **Test framework**: vitest, jest, mocha, pytest, unittest
- **Build system**: tsc, vite, webpack, esbuild, setuptools, hatch
- **CI provider**: GitHub Actions (v1). GitLab, CircleCI planned.
- **Linter**: eslint, prettier, biome, ruff, black, mypy

## Commands

```bash
npx anvil init              # Detect project and generate config
npx anvil init --local      # Write MCP config to .claude/settings.local.json (gitignored)
npx anvil init --dry-run    # Show what would be generated without writing
npx anvil doctor            # Validate existing configuration
```

## Development

```bash
npm install
npm run build        # TypeScript compilation
npm run typecheck    # Type check without emitting
npm run lint         # ESLint + Prettier
npm run test         # All tests (vitest)
npm run test:unit    # Unit tests only
npm run test:coverage # Tests with coverage
```

## License

MIT
