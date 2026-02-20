# Anvil — Implementation Plan

> A scaffolder for Claude Code that configures proven MCP servers, generates tailored CLAUDE.md, and sets up hooks.

## What We're Building

A CLI tool (`npx anvil init`) that analyzes a developer's project and generates Claude Code configuration. Anvil doesn't build AI capabilities — it configures the best existing ones.

### Core Commands

- **`anvil init`** — Detect project characteristics, generate CLAUDE.md, configure MCP servers, set up hooks and slash commands
- **`anvil doctor`** — Validate existing configuration (servers reachable, commands work, env vars set)

---

## Architecture

```
anvil/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry (commander)
│   │   ├── commands/
│   │   │   ├── init.ts           # anvil init
│   │   │   └── doctor.ts         # anvil doctor
│   │   └── prompts.ts            # Interactive prompts (enquirer)
│   ├── detector/
│   │   ├── index.ts              # Detection orchestrator
│   │   ├── language.ts           # Language detection
│   │   ├── package-manager.ts    # Package manager detection
│   │   ├── test-framework.ts     # Test framework detection
│   │   ├── build-system.ts       # Build system detection
│   │   ├── ci-provider.ts        # CI provider detection
│   │   ├── linter.ts             # Linter detection
│   │   └── types.ts              # Zod schemas for detection results
│   ├── generator/
│   │   ├── index.ts              # Generation orchestrator
│   │   ├── claude-md.ts          # CLAUDE.md generation
│   │   ├── mcp-config.ts         # .mcp.json generation
│   │   ├── hooks.ts              # Hooks config generation
│   │   └── slash-commands.ts     # .claude/commands/ generation
│   └── index.ts                  # Package entry
├── tests/
│   ├── unit/
│   │   ├── detector/             # One test file per detector
│   │   └── generator/            # One test file per generator
│   ├── integration/
│   │   ├── init-command.test.ts  # Full init flow against fixture projects
│   │   └── doctor-command.test.ts
│   └── fixtures/
│       ├── node-ts-project/      # Minimal Node.js/TS project
│       ├── python-project/       # Minimal Python project
│       ├── monorepo/             # Monorepo fixture
│       └── empty-project/        # Edge case: empty directory
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── CLAUDE.md
└── README.md
```

### Key Design Decisions

**Scaffolder, not MCP server.** The original plan was to build a full MCP server with memory, codebase intelligence, and CI tools. After evaluating the ecosystem (see `docs/assessment.md`), every individual capability has production-ready implementations. Anvil configures the best existing servers instead of reimplementing them. Claude orchestrates multi-server workflows natively — no glue server needed.

**Parse config files, don't execute commands.** Detection reads package.json scripts, pyproject.toml, tsconfig.json, etc. It doesn't run `npm test --help` or similar. This is faster, safer, and works without installed dependencies.

**Write `.mcp.json` by default.** Project-scoped, version-controllable. Team members get the same MCP servers automatically. `--local` flag writes to `.claude/settings.local.json` instead for sensitive or personal configs.

**No templating engine.** Generated files use string interpolation. CLAUDE.md and .mcp.json are simple enough that Handlebars/EJS adds unnecessary complexity.

**Node.js/TS + Python in v1.** These cover the majority of Claude Code users. Rust and Go in v1.1 based on demand.

---

## Detection Specifications

### What Gets Detected

| Category | Signal Files | Extracted Info |
|----------|-------------|----------------|
| Language | `package.json`, `pyproject.toml`, `setup.py`, `requirements.txt` | Primary language(s) |
| Package manager | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `uv.lock`, `poetry.lock` | Install command |
| Test framework | vitest/jest/mocha configs, `package.json` scripts, `pyproject.toml [tool.pytest]` | Test command |
| Build system | `tsconfig.json`, vite/webpack/esbuild configs, `package.json` scripts | Build command |
| CI provider | `.github/workflows/*.yml` | CI server to configure |
| Linter | eslint/prettier/biome/ruff configs | Lint command, format command |
| Monorepo | `pnpm-workspace.yaml`, `nx.json`, `turbo.json` | Workspace structure |

### Detection Approach (Medium Depth)

1. Check manifest file existence to determine language
2. Parse scripts sections (package.json `scripts`, pyproject.toml `[tool.X]`) to extract actual commands
3. Check for framework-specific config files (vitest.config.ts, jest.config.js, etc.)
4. Fall back to convention-based defaults if scripts are empty

---

## Generation Specifications

### CLAUDE.md

Generated with real extracted commands. Structure:

```markdown
# CLAUDE.md

## Build & Test Commands
<actual commands from package.json scripts or pyproject.toml>

## Architecture
<brief description based on detected framework — e.g., "Next.js app with App Router">

## Key Directories
<detected from actual directory structure>

## Code Style
<detected linter config summary>

## MCP Servers Available
<documentation of configured servers so Claude knows what tools it has>

## Project-Specific Notes
<placeholder for developer to fill in>
```

### .mcp.json

Server selection based on detected stack:

```json
{
  "mcpServers": {
    "memory": {
      "command": "python",
      "args": ["-m", "mcp_memory_service"],
      "env": {}
    },
    "lsp": {
      "command": "npx",
      "args": ["-y", "@mizchi/lsmcp", "-p", "tsgo"]
    },
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "coverage": {
      "command": "npx",
      "args": ["-y", "test-coverage-mcp"]
    }
  }
}
```

Servers are included only when relevant (e.g., no github-mcp-server if no .github/ directory).

### Hooks Config

Written to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "type": "command",
        "command": "<detected formatter command>"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "type": "command",
        "command": "anvil-hooks/block-dangerous.sh"
      }
    ]
  }
}
```

### Slash Commands

Generated in `.claude/commands/`:

- `/review` — code review workflow using codebase intelligence
- `/test` — run tests with coverage tracking
- Custom commands based on detected scripts

---

## MCP Servers We Configure

| Server | Install Method | When Configured |
|--------|---------------|-----------------|
| [mcp-memory-service](https://github.com/doobidoo/mcp-memory-service) | `pip install mcp-memory-service` | Always (cross-session memory is universally useful) |
| [lsmcp](https://github.com/mizchi/lsmcp) | `npx @mizchi/lsmcp` | TypeScript, Go, or Rust projects |
| [mcp-server-tree-sitter](https://github.com/wrale/mcp-server-tree-sitter) | `pip install mcp-server-tree-sitter` | Python projects, or when lsmcp doesn't cover the language |
| [github-mcp-server](https://github.com/github/github-mcp-server) | Docker or npx | When .github/ directory exists |
| [test-coverage-mcp](https://github.com/goldbergyoni/test-coverage-mcp) | `npx test-coverage-mcp` | When test framework is detected |

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript 5.x (strict) | Type safety, Claude Code native |
| Runtime | Node.js 20+ | LTS |
| CLI framework | commander | Standard, lightweight |
| Interactive prompts | enquirer | Better DX than readline |
| Validation | Zod | Runtime validation, good TS inference |
| Tests | Vitest | Fast, ESM-native |
| Linting | ESLint 9 (flat config) + Prettier | Industry standard |
| Build | tsc | No bundler needed for CLI |

---

## Implementation Phases

### Phase 1: Foundation
- Project scaffold (package.json, tsconfig, eslint, vitest, prettier)
- CLI skeleton with commander (`anvil init`, `anvil doctor`)
- Zod schemas for detection results (`src/detector/types.ts`)
- Detection orchestrator interface
- Unit test infrastructure

### Phase 2: Detectors (Node.js/TS)
- Language detector (package.json → Node.js/TypeScript)
- Package manager detector (lockfile detection)
- Test framework detector (vitest, jest, mocha from scripts/configs)
- Build system detector (tsc, vite, webpack, esbuild from scripts/configs)
- CI provider detector (.github/workflows/ → GitHub Actions)
- Linter detector (eslint, prettier, biome from configs)
- Unit tests for each detector + integration test with fixture project

### Phase 3: Detectors (Python)
- Language detector (pyproject.toml, setup.py, requirements.txt)
- Package manager detector (pip, poetry, uv, pipenv)
- Test framework detector (pytest, unittest)
- Build system detector (setuptools, hatch, maturin)
- Linter detector (ruff, black, flake8, mypy)
- Unit tests + Python fixture project

### Phase 4: Generators
- CLAUDE.md generator (string interpolation + detected context)
- .mcp.json generator (server selection based on detected stack)
- Hooks config generator (formatter, linter, dangerous command blocker)
- Slash commands generator
- Integration test: detect → generate → validate output

### Phase 5: CLI Polish
- Interactive mode (prompt when detection is ambiguous)
- `--dry-run` flag (show what would be generated)
- `--force` flag (overwrite existing files)
- `anvil doctor` implementation
- Error handling audit
- Cross-platform testing

### Phase 6: Publish
- npm publish workflow (.github/workflows/release.yml)
- Final documentation pass

---

## Quality Engineering

### Testing Strategy

- **Unit tests** (90%+ coverage): One test file per detector and generator. Mock filesystem for detectors, validate output strings for generators.
- **Integration tests**: Run `anvil init` against fixture projects, verify generated files match expected output.
- **Edge cases**: Empty projects, corrupted configs, monorepos, mixed-language projects.

### Test Patterns

- London School TDD for detectors and generators (mock fs, test behavior)
- Fixture-based for integration tests (real project directories)
- No live API calls — all filesystem-based

---

## What We Explicitly Won't Build

- **MCP server** — Claude orchestrates existing servers. No glue server needed for v1.
- **Memory, embeddings, vector search** — Delegated to mcp-memory-service
- **Code parsing, AST analysis** — Delegated to lsmcp / tree-sitter servers
- **GitHub API integration** — Delegated to github-mcp-server
- **Coverage parsing** — Delegated to test-coverage-mcp
- **Agent orchestration, swarm coordination** — Claude Code's Task tool handles this
- **Anything that returns mock data** — Every generated file is based on real detection

---

## Success Criteria

1. Run `npx anvil init` on a Node.js/TypeScript project → get a working CLAUDE.md, configured MCP servers, and useful hooks
2. Run `npx anvil init` on a Python project → same quality output
3. Run `anvil doctor` → clear report of what's working and what's missing
4. A developer who has never configured Claude Code MCP servers can be fully set up in under 2 minutes
