# Licensing

Pasmello uses a dual-license model to balance open-source freedom with ecosystem flexibility.

## Core Platform — AGPL-3.0

The core platform is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This covers:
- `apps/web/` — SvelteKit frontend
- `apps/server/` — Go backend

The AGPL-3.0 ensures that if you modify Pasmello and offer it as a network service, you must make your source code available to users of that service. This protects the project from closed-source hosted clones while keeping the core genuinely open source.

## SDK, Shared Types & Built-in Tools — Apache 2.0

The developer-facing packages and example tools are licensed under the [Apache License 2.0](LICENSE-APACHE).

This covers:
- `packages/sdk/` — @pasmello/sdk (Tool SDK)
- `packages/shared/` — Shared TypeScript types
- `tools/builtin/` — Built-in tools (clock, notes, bookmarks)

The Apache 2.0 license means tool developers can build commercial, proprietary, or open-source tools without any copyleft obligations. The patent grant in Apache 2.0 provides additional legal protection for tool authors.

## What This Means for You

**Building tools/plugins?** You're free to use any license you want. The SDK and shared types are Apache 2.0 — no restrictions on your tools. The iframe sandbox architecture means your tools are separate processes, not derivative works of the AGPL core.

**Self-hosting Pasmello as-is?** Completely fine. AGPL only triggers if you modify the source and offer it as a service.

**Modifying and hosting Pasmello as a service?** You must release your modifications under AGPL-3.0. See the [full license](LICENSE) for details.

**Contributing?** Contributions to AGPL-licensed code are under AGPL-3.0. Contributions to Apache-licensed code are under Apache 2.0. The license of the directory you're contributing to determines which applies.
