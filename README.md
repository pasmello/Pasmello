# Pasmello

A local-first, browser-only sandbox toolkit. Build personalized workspaces with modular tools, automated workflows, and a community-driven ecosystem — running entirely inside your browser, no server required.

## Quick Start

```bash
# Install dependencies (Node ≥ 24, pnpm ≥ 10)
make install

# Development server (http://localhost:5173)
make dev

# Production build → static site in apps/web/build
make build

# Preview the production build locally
make preview
```

The build output is a plain static site. Drop it on any static host (GitHub Pages, Cloudflare Pages, Netlify, your own nginx) — no backend to deploy.

## What is Pasmello?

Pasmello is a customizable workspace platform that runs entirely in your browser. Think of it as a local-first productivity OS where you:

- **Build workspaces** with modular tools (clocks, notes, API monitors, AI helpers, …)
- **Automate workflows** by chaining tools together (DAG-based, Web Worker isolated)
- **Stay secure** — every tool runs in a sandboxed iframe with permission-gated I/O. Untrusted code (third-party tools, marketplace workflows, LLM-generated automation) is contained by the browser sandbox itself
- **Own your data** — everything lives in OPFS (browser-private file system). Export/import as a portable zip whenever you want

## Architecture

Pure static SvelteKit app. Open it in a browser and you are the entire stack.

- **Frontend:** SvelteKit 2 (Svelte 5) + Vite, `adapter-static`
- **Backend:** none — runs in the browser
- **Storage:** OPFS via `navigator.storage.getDirectory()`. Portable export/import as zip (Settings → Backup)
- **Tool isolation:** sandboxed `<iframe srcdoc>` + per-tool `MessageChannel`. Host validates every storage / network request against the tool's manifest permissions
- **Tool packages:** zip files containing `tool.manifest.json` + a single-file `dist/index.html`

### Why no server?

Pasmello runs untrusted code, and the browser sandbox is far stronger than any local daemon could provide without bespoke RLIMIT/seccomp hardening. Server-class features (background cron, multi-device sync, internal-network proxying) are intentionally reserved for paid tiers and the Enterprise edition — the OSS core stays small, auditable, and deployable to any static host.

## Project Structure

```
apps/web/              — SvelteKit app (the entire OSS product)
  src/lib/storage/     — OPFS storage adapter + portable export/import
  src/lib/sandbox/     — HostBridge / MessageChannel handlers
  src/lib/tools/       — Tool zip install (file / URL / drag-drop / builtin)
  src/lib/theme/       — Theme registry + built-in shells
  src/lib/bootstrap.ts — First-run init (storage, builtins, default workspace)
  static/builtins/     — Generated tool zips (gitignored, via make bundle-builtins)
packages/sdk/          — @pasmello/sdk (tool-side TypeScript SDK)
packages/shared/       — Shared TypeScript types
tools/builtin/         — Built-in tool sources (clock; more to come)
```

## Tiers (Roadmap)

This repository is **Tier 1 (OSS)** only. Higher tiers extend the same Storage / Workflow / Marketplace interfaces:

| Tier | Status | What it adds |
|------|--------|---|
| 1. OSS | This repo | Static web app, OPFS, in-browser workflows |
| 2. Plus / Pro | Future | Cloud-mounted filesystem, background cron, multi-device sync, mobile apps |
| 3. Marketplace | Future, separate project | Community catalog of tools, themes, workflows |
| 4. Enterprise | Future | SSO/RBAC/audit, on-prem deploy, internal-network proxy, team workspaces |

## License

Dual-licensed. See [LICENSING.md](LICENSING.md) for the breakdown:
- **Core platform** (`apps/web/`): AGPL-3.0
- **SDK, shared types, built-in tools** (`packages/`, `tools/builtin/`): Apache 2.0
