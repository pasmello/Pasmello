import type { PluginKind } from '@pasmello/shared';

/** Soft caps per plugin (bytes). Enforcement is gated by FEATURE_QUOTA_ENFORCE.
 *  These are tuned by plugin class: themes ship more media than tools. */
export const PLUGIN_SOFT_CAPS: Record<PluginKind, number> = {
    tool: 10 * 1024 * 1024,   // 10 MB
    theme: 20 * 1024 * 1024,  // 20 MB
};

/** Turn on to refuse writes that would push a plugin over its soft cap.
 *  Left off in v1 — the UI just meters + warns. */
export const FEATURE_QUOTA_ENFORCE = false;

export interface PluginUsage {
    kind: PluginKind;
    id: string;
    bytes: number;
    cap: number;
    ratio: number;
}

/**
 * Walk the OPFS subtree that belongs to one plugin and sum file sizes.
 * For tools this includes the installed bundle + every workspace's tool-data;
 * for themes it's the installed bundle (workspace-scoped theme storage isn't
 * implemented yet but will fold in under the same walker when it is).
 */
export async function getPluginUsage(kind: PluginKind, id: string): Promise<number> {
    const root = await navigator.storage.getDirectory();
    let total = 0;

    if (kind === 'tool') {
        total += await dirSize(root, ['tools', id]);
        const wsDir = await openDir(root, ['workspaces']);
        if (wsDir) {
            for await (const [wsName, handle] of dirEntries(wsDir)) {
                if (handle.kind !== 'directory') continue;
                total += await dirSize(root, ['workspaces', wsName, 'data', id]);
            }
        }
    } else if (kind === 'theme') {
        total += await dirSize(root, ['themes', id]);
    }

    return total;
}

export async function getAllPluginUsage(plugins: Array<{ kind: PluginKind; id: string }>): Promise<PluginUsage[]> {
    const out: PluginUsage[] = [];
    for (const p of plugins) {
        const bytes = await getPluginUsage(p.kind, p.id);
        const cap = PLUGIN_SOFT_CAPS[p.kind];
        out.push({
            kind: p.kind,
            id: p.id,
            bytes,
            cap,
            ratio: cap > 0 ? bytes / cap : 0,
        });
    }
    return out;
}

async function openDir(
    root: FileSystemDirectoryHandle,
    path: string[],
): Promise<FileSystemDirectoryHandle | null> {
    let cur = root;
    for (const seg of path) {
        try {
            cur = await cur.getDirectoryHandle(seg);
        } catch {
            return null;
        }
    }
    return cur;
}

async function dirSize(root: FileSystemDirectoryHandle, path: string[]): Promise<number> {
    const dir = await openDir(root, path);
    if (!dir) return 0;
    let total = 0;
    for await (const [, handle] of dirEntries(dir)) {
        if (handle.kind === 'directory') {
            total += await subtreeSize(handle as FileSystemDirectoryHandle);
        } else {
            const file = await (handle as FileSystemFileHandle).getFile();
            total += file.size;
        }
    }
    return total;
}

async function subtreeSize(dir: FileSystemDirectoryHandle): Promise<number> {
    let total = 0;
    for await (const [, handle] of dirEntries(dir)) {
        if (handle.kind === 'directory') {
            total += await subtreeSize(handle as FileSystemDirectoryHandle);
        } else {
            const file = await (handle as FileSystemFileHandle).getFile();
            total += file.size;
        }
    }
    return total;
}

async function* dirEntries(
    dir: FileSystemDirectoryHandle,
): AsyncGenerator<[string, FileSystemHandle]> {
    const iter = (dir as unknown as {
        entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    }).entries();
    for await (const entry of iter) yield entry;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
