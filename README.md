# Anvil

A Claude Code MCP server that fills the gaps Claude Code can't cover on its own: cross-session memory, structural codebase intelligence, and CI/CD feedback loops.

## What It Does

Anvil is a single MCP server exposing three tool groups:

- **Memory** — Persistent cross-session storage with semantic search. SQLite backend + local ONNX embeddings (`all-MiniLM-L6-v2`). No external API calls.
- **Codebase Intelligence** — Structural understanding of your repo via tree-sitter. Dependency graphs, symbol lookup, impact analysis ("what breaks if I change this interface?").
- **CI/CD Integration** — GitHub Actions status, parsed failure logs, and diff coverage reports piped directly into Claude's context.

## Why

Claude Code is capable out of the box — file ops, shell execution, sub-agents, web access. But it has real gaps:

1. Every session starts from zero. No memory of previous sessions.
2. No structural understanding of codebases. It greps and globs but can't answer "what depends on this module?" without reading everything.
3. No visibility into CI. Tests pass locally, fail in CI, and Claude has no way to know.

Anvil addresses these three gaps. Nothing more.

## Installation

```bash
npm install anvil
```

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "anvil": {
      "command": "npx",
      "args": ["anvil"]
    }
  }
}
```

## Tools

### Memory

| Tool | Description |
|------|-------------|
| `memory_store` | Store a key-value pair with optional tags and namespace. Generates embeddings automatically. |
| `memory_search` | Semantic search across stored memories using cosine similarity. |
| `memory_list` | List stored entries, filterable by namespace or tag. |
| `memory_forget` | Delete entries by key, namespace, or age. |

### Codebase Intelligence

| Tool | Description |
|------|-------------|
| `codebase_index` | Parse and index a directory with tree-sitter. Incremental — only re-parses changed files. |
| `codebase_query` | Query the dependency graph: dependents, dependencies, symbol lookup, impact analysis. |
| `codebase_symbols` | List symbols (functions, classes, types) in a file. |

### CI/CD

| Tool | Description |
|------|-------------|
| `ci_status` | Get latest GitHub Actions workflow runs for a branch or PR. |
| `ci_logs` | Download and parse CI logs, extracting errors and annotations. |
| `ci_coverage` | Parse coverage artifacts and compute diff coverage for changed lines. |

## Project Scaffolding

```bash
npx anvil init
```

Analyzes your project and generates a `CLAUDE.md` with your actual build/test/lint commands, plus Claude Code hooks configuration.

## Tech Stack

- TypeScript (strict mode), Node.js 20+
- SQLite via better-sqlite3
- Tree-sitter for code parsing
- ONNX Runtime for local embeddings
- Octokit for GitHub Actions API
- MCP SDK for protocol handling
- Zod for runtime validation

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
