import type { RequestHandler } from './host-bridge.js';
import { goto } from '$app/navigation';
import { base } from '$app/paths';

const ROUTES = {
    workspace: '/',
    tools: '/tools',
    themes: '/themes',
    workflows: '/workflows',
    settings: '/settings',
} as const;

export type NavTarget = keyof typeof ROUTES;

function isNavTarget(x: unknown): x is NavTarget {
    return typeof x === 'string' && x in ROUTES;
}

/**
 * Chrome theme → host navigation. The host allowlists top-level views and
 * routes through SvelteKit's `goto`; any other target is silently rejected.
 */
export function createNavHandler(): RequestHandler {
    return async (_pluginId, data) => {
        const { to } = (data ?? {}) as { to?: unknown };
        if (!isNavTarget(to)) return { ok: false };
        await goto(`${base}${ROUTES[to]}`);
        return { ok: true };
    };
}

export function createChromeResizeHandler(
    onResize: (pluginId: string, size: number) => void,
): RequestHandler {
    return async (pluginId, data) => {
        const { size } = (data ?? {}) as { size?: unknown };
        if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
            return { ok: false };
        }
        onResize(pluginId, Math.round(size));
        return { ok: true };
    };
}
