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

## Design Principles for Anvil

Based on this assessment:

1. **Only build what Claude Code can't do natively** — Don't wrap existing capabilities in ceremony
2. **Every tool must do real work** — No stubs, no mock returns, no facades
3. **Persistence is the core value** — Cross-session memory is the #1 gap
4. **Structural understanding beats token-burning** — Index the codebase once, query it efficiently
5. **CI integration closes the loop** — Local tests aren't enough for enterprise work
6. **Prove it with tests** — If a feature can't be tested, it doesn't exist
7. **Small surface area** — One MCP server, a handful of tools, a good CLAUDE.md
