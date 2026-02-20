# Anvil - Prior Art Assessment

## Context

This document captures findings from auditing the `claude-flow` project, an npm package marketed as "Enterprise AI agent orchestration for Claude Code." The audit was conducted to understand what genuinely extends Claude Code's capabilities versus what is facade, and to inform the design of Anvil.

## Claude Code's Native Capabilities (What Already Works)

Before building anything, it's important to understand what Claude Code does well out of the box:

- **File operations**: Read, Write, Edit, Glob, Grep — full codebase access
- **Shell execution**: Run any command via Bash tool
- **Sub-agent spawning**: Task tool creates parallel sub-agents with full tool access
- **Web access**: WebFetch and WebSearch for documentation/research
- **Hooks system**: Real pre/post hooks on tool usage (runs shell commands)
- **MCP integration**: Connect to external MCP servers for additional tools
- **Conversation memory**: Unlimited context via automatic summarization within a session

## Claude Code's Actual Gaps (What's Missing)

### 1. No Cross-Session Memory
Every new session starts from zero. Claude Code can't recall what it learned about your codebase yesterday — architectural decisions, failed approaches, discovered patterns, or resolved bugs. The CLAUDE.md file is the only persistence mechanism, and it's static.

### 2. No Codebase Intelligence
For large repos, Claude burns significant tokens navigating. It can grep and glob, but it has no structural understanding — no dependency graph, no "which files are affected if I change this interface," no call-site analysis. Every session re-discovers the same architecture.

### 3. No CI/CD Feedback Loop
Claude can run `npm test` locally, but has no visibility into the actual CI pipeline. It can't see that tests pass locally but fail in CI due to environment differences, missing env vars, or integration test failures. There's no structured way to feed CI results back into Claude's context.

### 4. No Enforced Quality Gates
Claude Code's hooks can run linters, but there's no structured framework for enforcing enterprise standards — security scanning, architectural conformance, dependency auditing, or coverage thresholds — as part of the development loop.

## claude-flow Audit Findings

### What Was Real
- **HNSW vector index**: 1,013 lines of genuine implementation with BinaryHeap, quantization, multiple distance metrics (`v3/@claude-flow/memory/src/hnsw-index.ts`)
- **SQLite persistence**: Real `better-sqlite3`/`sql.js` backend with actual SQL queries (`v3/@claude-flow/memory/src/sqlite-backend.ts`)
- **ReasoningBank**: 1,280-line 4-step pipeline (retrieve/judge/distill/consolidate) (`v3/@claude-flow/neural/src/reasoning-bank.ts`)
- **RL algorithms**: Simplified but mathematically correct PPO, Q-Learning, SARSA implementations
- **Consensus algorithms**: Complete PBFT and Raft implementations (but single-process, no networking)

### What Was Facade
- **"60+ agents"**: Markdown template files in `.claude/agents/`, not executable code
- **Swarm coordination**: `swarm_init` returns `{swarmId: 'swarm-' + Date.now()}` and writes a JSON file
- **Background workers**: `setInterval()` in the main thread with event emitters, no child processes
- **Hooks system**: In-memory `Map` that logs stats, doesn't intercept tool calls, lost on restart
- **MCP tools**: Stub handlers returning mock data for most operations
- **Agent spawning**: Writes metadata to a JSON file, no process management

### What Was Missing Entirely
- Flash Attention (documented as "2.49x-7.47x speedup" but not implemented)
- MoE routing (config flags only, no expert network code)
- Hyperbolic embeddings (plugin stub, unreferenced)
- External API integration (zero calls to Anthropic, OpenAI, or any service)

### The Core Insight
claude-flow's most effective component was its CLAUDE.md — a 1,000+ line prompt engineering framework that instructs Claude Code how to use its native Task tool. The npm package primarily delivered that prompt plus a key-value store.

## MCP Ecosystem Analysis (February 2026)

After the claude-flow audit, we evaluated whether to build these capabilities from scratch or use existing MCP servers. The ecosystem has matured fast — production-ready servers exist for every gap identified above.

### Memory / Cross-Session Persistence

| Server | Stars | Approach | Notes |
|--------|-------|----------|-------|
| [@modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) | (official) | Knowledge graph, JSONL file | No semantic search. Literal text matching only. |
| [mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | 1.4k | Hybrid BM25+vector, SQLite, local ONNX embeddings | **Best in class.** v10.16, 2k+ commits. True semantic search. |
| [Recall](https://github.com/joseairosa/recall) | — | Redis/Valkey, AES-256 encryption | SaaS or self-hosted. Team sharing. |
| [@shodh/memory-mcp](https://www.npmjs.com/package/@shodh/memory-mcp) | — | 3-tier cognitive architecture, MiniLM-L6 | Fully local. Same embedding model we planned to use. |

**Verdict:** Cross-session memory is a solved problem. mcp-memory-service is the clear leader.

### Codebase Intelligence

| Server | Stars | Approach | Notes |
|--------|-------|----------|-------|
| [lsmcp](https://github.com/mizchi/lsmcp) | 439 | Real LSP servers (tsgo, rust-analyzer, gopls) | **Semantically richest.** Actual IDE-grade refactoring, go-to-definition, rename. TypeScript. |
| [mcp-server-tree-sitter](https://github.com/wrale/mcp-server-tree-sitter) | 264 | Tree-sitter AST analysis | Mature. 25+ tools. Python. |
| [code-graph-mcp](https://github.com/entrepeneur4lyf/code-graph-mcp) | 79 | ast-grep, 25+ languages, dep analysis | PageRank, circular dep detection. Python. |
| [code-index-mcp](https://github.com/johnhuang316/code-index-mcp) | — | Tree-sitter + persistent caching | Incremental with file change detection. |

**Verdict:** Multiple mature implementations. lsmcp is the most capable for TypeScript/Go/Rust. tree-sitter servers cover broader language support.

### CI/CD Integration

| Server | Stars | Approach | Notes |
|--------|-------|----------|-------|
| [github-mcp-server](https://github.com/github/github-mcp-server) | 27k | Official GitHub server | Actions, PRs, issues, code security. Log retrieval. |
| [test-coverage-mcp](https://github.com/goldbergyoni/test-coverage-mcp) | 39 | LCOV parsing, diff-from-baseline | Token-efficient (<100 tokens). Session-scoped diff coverage. |

**Verdict:** Official GitHub server covers Actions status and logs. test-coverage-mcp handles coverage tracking. The only gap was CI artifact-based diff coverage, which test-coverage-mcp partially addresses.

### The Strategic Conclusion

Every feature we planned to build from scratch has production-ready alternatives. Building our own implementations would mean:
- Competing against official servers (Anthropic memory, GitHub MCP)
- Reimplementing commodity features
- Significant effort for marginal differentiation

The only unique value we could offer is **integration between tools** — but Claude already orchestrates multi-server workflows natively. The glue is better expressed as CLAUDE.md instructions and hooks than as another MCP server.

This led to Anvil's pivot: from MCP server to **scaffolder**. See `docs/plan.md` for the revised architecture.

## Design Principles for Anvil (Revised)

Based on both the claude-flow audit and the ecosystem analysis:

1. **Don't reinvent the wheel** — Use the best existing MCP servers, don't rebuild them
2. **Configure, don't code** — The value is in setup and orchestration, not reimplementation
3. **Every generated file is based on real detection** — No guesses, no mock data
4. **Prove it with tests** — If a feature can't be tested, it doesn't exist
5. **Small surface area** — One CLI tool, a few generated files, done in 2 minutes
