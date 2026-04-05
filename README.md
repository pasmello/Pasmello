# Pasmello

A local-first, web-based sandbox toolkit. Build personalized workspaces with modular tools, automated workflows, and a community-driven ecosystem.

## Quick Start

```bash
# Install dependencies
make install

# Development
make dev

# Production build
make build
./pasmello
```

## What is Pasmello?

Pasmello is a customizable workspace platform that runs locally in your browser. Think of it as a local-first productivity OS where you:

- **Build workspaces** with modular tools (email, LLM, API monitors, etc.)
- **Automate workflows** by chaining tools together (DAG-based visual editor)
- **Stay secure** — tools run in sandboxed iframes with permission-gated access
- **Own your data** — everything stored as human-readable files in `~/.pasmello/`

## Architecture

Single Go binary embeds the compiled frontend. Run `./pasmello` → server starts on `localhost:9090` → browser opens → you're in.

- **Frontend:** SvelteKit 2 (Svelte 5)
- **Backend:** Go + Fiber
- **Storage:** File-based (JSON/TOML), no database
- **Security:** Sandboxed iframes + MessageChannel isolation + permission-gated proxy

## Project Structure

```
apps/web/          — SvelteKit frontend
apps/server/       — Go backend
packages/sdk/      — @pasmello/sdk (Tool SDK)
packages/shared/   — Shared TypeScript types
tools/builtin/     — Built-in tools
```

## License

MIT
