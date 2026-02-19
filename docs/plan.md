# Anvil — Implementation Plan

> A genuine Claude Code extension for enterprise-grade software development.

## Project Name: Anvil

An anvil is where raw material is shaped into useful tools through real craftsmanship. No theater — just solid engineering.

---

## What We're Building

A single MCP server with three tool groups, backed by proven patterns and real implementations:

1. **Memory** — Persistent cross-session context with semantic search
2. **Codebase Intelligence** — Structural understanding of the repo via tree-sitter
3. **CI/CD Integration** — Feedback loop from GitHub Actions into Claude's context

Plus: a project scaffolder that generates a focused CLAUDE.md and Claude Code hooks for any repo.

---

## Architecture

```
anvil/
├── src/
│   ├── server.ts                 # MCP server (JSON-RPC 2.0 over stdio)
│   ├── tools/
│   │   ├── memory.ts             # memory_store, memory_search, memory_list, memory_forget
│   │   ├── codebase.ts           # codebase_index, codebase_query, codebase_symbols
│   │   ├── ci.ts                 # ci_status, ci_logs, ci_coverage
│   │   └── index.ts              # Tool registry
│   ├── memory/
│   │   ├── store.ts              # SQLite backend (better-sqlite3)
│   │   ├── embeddings.ts         # Local embedding generation (ONNX runtime)
│   │   └── index.ts
│   ├── indexer/
│   │   ├── parser.ts             # Tree-sitter parsing
│   │   ├── graph.ts              # Dependency graph construction
│   │   ├── symbols.ts            # Symbol extraction (functions, classes, types)
│   │   └── index.ts
│   ├── ci/
│   │   ├── github-actions.ts     # GitHub Actions API client
│   │   ├── parsers.ts            # Log/coverage report parsers
│   │   └── index.ts
│   └── index.ts                  # Entry point
├── tests/
│   ├── unit/
│   │   ├── memory/
│   │   │   ├── store.test.ts
│   │   │   └── embeddings.test.ts
│   │   ├── indexer/
│   │   │   ├── parser.test.ts
│   │   │   ├── graph.test.ts
│   │   │   └── symbols.test.ts
│   │   ├── ci/
│   │   │   ├── github-actions.test.ts
│   │   │   └── parsers.test.ts
│   │   └── tools/
│   │       ├── memory.test.ts
│   │       ├── codebase.test.ts
│   │       └── ci.test.ts
│   ├── integration/
│   │   ├── mcp-server.test.ts    # Full MCP protocol tests
│   │   ├── memory-e2e.test.ts    # Store → search → retrieve cycle
│   │   └── indexer-e2e.test.ts   # Parse → query real repos
│   └── fixtures/
│       ├── sample-repo/          # Minimal repo for indexer tests
│       ├── ci-responses/         # Recorded GitHub API responses
│       └── embeddings/           # Pre-computed test embeddings
├── docs/
│   ├── assessment.md             # Claude-flow audit findings
│   ├── plan.md                   # This document
│   └── architecture.md           # Technical deep-dive (generated during build)
├── .github/
│   └── workflows/
│       ├── ci.yml                # Build, lint, test on every PR
│       ├── release.yml           # Automated npm publish on tags
│       └── codeql.yml            # GitHub security scanning
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js              # Flat config (ESLint 9+)
├── .prettierrc
├── CLAUDE.md
├── CHANGELOG.md
├── LICENSE
└── README.md
```

### Key Design Decisions

**Single package, not a monorepo.** claude-flow had 20 packages for no reason. This is one npm package with one entry point. If it grows, we split later with evidence, not speculation.

**better-sqlite3, not sql.js.** sql.js (WASM SQLite) is slower and exists for browser compatibility we don't need. better-sqlite3 is synchronous, faster, and purpose-built for Node.js servers. Falls back to sql.js only if native compilation fails.

**Tree-sitter for parsing, not regex.** Regex-based code analysis is fragile. Tree-sitter gives us real ASTs for 100+ languages, is battle-tested (used by GitHub, Neovim, Zed), and has Node.js bindings.

**Local embeddings via ONNX Runtime.** No external API calls for embeddings. Use `@xenova/transformers` (now `@huggingface/transformers`) to run `all-MiniLM-L6-v2` locally. ~80MB model, runs in <50ms per query. Falls back to TF-IDF if ONNX isn't available.

**GitHub Actions first.** Enterprise CI/CD is fragmented (Jenkins, GitLab, CircleCI, etc.). We start with GitHub Actions because it has the best API and largest share. Add others via adapter pattern later, driven by actual demand.

---

## Tool Specifications

### Memory Tools

#### `memory_store`
```
Input:  { key: string, value: string, tags?: string[], namespace?: string }
Output: { stored: true, id: string, embedding_generated: boolean }
```
- Generates embedding from value text using local ONNX model
- Stores in SQLite: id, key, value, embedding (BLOB), tags, namespace, created_at, accessed_at
- Deduplicates by key within namespace (upsert)

#### `memory_search`
```
Input:  { query: string, namespace?: string, limit?: number, min_similarity?: number }
Output: { results: Array<{ key, value, similarity, tags, last_accessed }> }
```
- Generates query embedding
- Cosine similarity search against stored embeddings
- For <10k entries, brute-force is fast enough. Add HNSW only when profiling shows need.

#### `memory_list`
```
Input:  { namespace?: string, tag?: string, limit?: number }
Output: { entries: Array<{ key, tags, namespace, created_at, accessed_at }> }
```

#### `memory_forget`
```
Input:  { key?: string, namespace?: string, older_than_days?: number }
Output: { deleted_count: number }
```

### Codebase Intelligence Tools

#### `codebase_index`
```
Input:  { path: string, languages?: string[], exclude?: string[] }
Output: { files_indexed: number, symbols_found: number, duration_ms: number }
```
- Walks directory, parses each file with tree-sitter
- Extracts: imports/exports, function signatures, class definitions, type declarations
- Builds dependency graph (file A imports from file B)
- Stores in SQLite for fast querying
- Incremental: only re-parses changed files (mtime check)

#### `codebase_query`
```
Input:  { symbol?: string, file?: string, dependents?: boolean, dependencies?: boolean }
Output: { files: Array<{ path, symbols, relationship }> }
```
- "What files import this module?" → dependents
- "What does this file depend on?" → dependencies
- "Where is this function defined?" → symbol lookup
- "What would be affected if I change this interface?" → transitive dependents

#### `codebase_symbols`
```
Input:  { path: string, kind?: "function" | "class" | "type" | "variable" }
Output: { symbols: Array<{ name, kind, line, signature, exported }> }
```

### CI/CD Tools

#### `ci_status`
```
Input:  { repo?: string, branch?: string, pr?: number }
Output: { runs: Array<{ id, status, conclusion, name, started_at, duration_s, url }> }
```
- Uses GitHub REST API (`GITHUB_TOKEN` from environment)
- Returns latest workflow runs for the branch/PR
- Highlights failures with job names

#### `ci_logs`
```
Input:  { run_id: number, job?: string, failed_only?: boolean }
Output: { logs: string, annotations: Array<{ level, message, file, line }> }
```
- Downloads and parses CI log output
- Extracts error annotations (file:line format)
- Truncates to relevant sections (last 200 lines of failed steps)

#### `ci_coverage`
```
Input:  { pr?: number, branch?: string }
Output: { total: number, diff: number, uncovered_files: Array<{ path, coverage }> }
```
- Parses coverage artifacts from CI runs (lcov, cobertura, istanbul)
- Computes diff coverage (coverage of changed lines only)
- Lists files below threshold

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript 5.x (strict) | Type safety, Claude Code native |
| Runtime | Node.js 20+ | LTS, required for ONNX |
| Package manager | npm | Simplest, no workspace needed for single package |
| Build | tsc | No bundler needed for a Node.js CLI tool |
| Test framework | Vitest | Fast, ESM-native, good DX |
| Linting | ESLint 9 (flat config) + Prettier | Industry standard |
| SQLite | better-sqlite3 (primary), sql.js (fallback) | Fast sync API for Node.js |
| Code parsing | tree-sitter (via node-tree-sitter) | Real ASTs for 100+ languages |
| Embeddings | @huggingface/transformers (ONNX) | Local, no API keys needed |
| CI integration | @octokit/rest | Official GitHub API client |
| MCP protocol | @modelcontextprotocol/sdk | Official MCP SDK |
| Schema validation | Zod | Runtime validation, good TS inference |

---

## Quality Engineering

### Testing Strategy

**Unit tests** (target: 90%+ coverage of `src/`)
- Every tool handler tested with mocked backends
- SQLite store tested with in-memory databases
- Embedding generation tested with fixture vectors
- Tree-sitter parsing tested against fixture repos
- CI parsers tested against recorded API responses

**Integration tests**
- Full MCP protocol: connect → initialize → tools/list → tools/call → verify response
- Memory round-trip: store → search → verify similarity ordering
- Indexer end-to-end: parse fixture repo → query symbols → verify graph
- CI integration: mock GitHub API → parse responses → verify output

**No UI tests needed** — this is a CLI/MCP server with no UI.

**Test patterns:**
- London School TDD for tool handlers (mock dependencies, test behavior)
- Chicago School for data layer (real SQLite, real tree-sitter, verify state)
- Recorded HTTP responses for CI tests (no live API calls in CI)

### Code Quality

```json
// eslint.config.js highlights
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "error"  // use structured logging
  }
}
```

- **Strict TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`
- **No `any`**: Every type explicitly defined
- **No floating promises**: All async operations awaited or explicitly voided
- **Prettier on save**: Consistent formatting, no style debates
- **Max file length**: 400 lines (enforced by lint rule)

### CI/CD Pipeline

#### `ci.yml` — Runs on Every PR and Push to Main

```yaml
jobs:
  quality:
    steps:
      - Checkout
      - Setup Node 20
      - npm ci
      - npm run lint          # ESLint + Prettier check
      - npm run typecheck     # tsc --noEmit
      - npm run test          # Vitest with coverage
      - Upload coverage to Codecov
      - Fail if coverage < 80%

  security:
    steps:
      - npm audit --audit-level=high
      - CodeQL analysis (GitHub native)

  build:
    needs: [quality, security]
    steps:
      - npm run build
      - Verify dist/ output exists
      - Smoke test: node dist/index.js --help
```

#### `release.yml` — Runs on Version Tags

```yaml
on:
  push:
    tags: ['v*']
jobs:
  publish:
    steps:
      - Run full test suite
      - npm run build
      - npm publish
      - Create GitHub Release with changelog
```

### Version Control

- **Trunk-based development**: Short-lived feature branches off `main`
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **Squash merges**: Clean linear history on main
- **Protected main branch**: Requires passing CI + 1 review
- **Automated changelog**: Generated from conventional commits via `standard-version` or `changesets`
- **Semantic versioning**: Breaking changes = major, features = minor, fixes = patch

### Documentation

- **README.md**: Installation, quick start, tool reference — nothing else
- **CLAUDE.md**: Build commands, test commands, architecture overview for Claude Code
- **docs/architecture.md**: Technical deep-dive, written during implementation
- **Inline JSDoc**: On all public functions and types, nothing on private internals
- **No aspirational documentation**: Only document what exists and works

---

## Implementation Phases

### Phase 1: Foundation
- Project scaffold (package.json, tsconfig, eslint, vitest, CI pipeline)
- MCP server skeleton (initialize, tools/list, tools/call routing)
- SQLite memory backend (store, retrieve, list, delete)
- Unit tests for memory backend
- Integration test for MCP protocol

### Phase 2: Memory Tools
- Local embedding generation (ONNX runtime with all-MiniLM-L6-v2)
- Semantic search (cosine similarity over embeddings)
- Memory MCP tools (memory_store, memory_search, memory_list, memory_forget)
- Fallback to TF-IDF when ONNX unavailable
- Full test coverage for memory tools

### Phase 3: Codebase Intelligence
- Tree-sitter integration (TypeScript, JavaScript, Python, Go initially)
- Symbol extraction (functions, classes, types, exports)
- Dependency graph construction (import/export analysis)
- Incremental indexing (mtime-based change detection)
- Codebase MCP tools (codebase_index, codebase_query, codebase_symbols)
- Integration tests against fixture repos

### Phase 4: CI/CD Integration
- GitHub Actions API client (via @octokit/rest)
- Workflow run status fetching
- Log parsing (extract errors, annotations, failed steps)
- Coverage report parsing (lcov, istanbul)
- CI MCP tools (ci_status, ci_logs, ci_coverage)
- Tests with recorded API responses

### Phase 5: Project Scaffolder
- Analyze existing project (detect package manager, test framework, linter)
- Generate CLAUDE.md with actual build/test/lint commands
- Generate Claude Code hooks config (.claude/settings.json)
- `npx anvil init` command

### Phase 6: Hardening
- Error handling audit (every failure path tested)
- Performance profiling (memory search latency, index build time)
- Add HNSW index if brute-force search is too slow at scale
- Binary distribution (prebuild native dependencies)
- Documentation finalization

---

## What We Explicitly Won't Build

- **Agent orchestration frameworks** — Claude Code's Task tool already does this
- **Swarm coordination** — Parallel sub-agents share a filesystem, no coordination layer needed
- **Neural networks / RL algorithms** — Claude IS the neural network
- **Consensus protocols** — There's no distributed system
- **Plugin registries** — Solve real problems first
- **Duplicate CLI wrappers** — One package, one entry point
- **Anything that returns mock data** — Every tool does real work or doesn't exist

---

## Success Criteria

The project is useful when a developer can:

1. Start a new Claude Code session and have it automatically recall context from the previous session
2. Ask "what files would be affected if I change this interface?" and get an accurate answer without Claude reading every file
3. See why CI failed and have Claude fix the issue without manual log copying
4. Run `npx anvil init` on any repo and get a useful CLAUDE.md + hooks config

Each of these must be tested, measured, and real.
