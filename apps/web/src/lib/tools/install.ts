import JSZip from 'jszip';
import type { ToolManifest } from '@pasmello/shared';
import { storage, isValidPathSegment, type ToolFile } from '$lib/storage';
import { eventBus } from '$lib/workflow/triggers';

export class ToolInstallError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolInstallError';
    }
}

export type ConsentProvider = (manifest: ToolManifest) => Promise<boolean>;

export interface InstallOptions {
    /** If provided, called with the parsed manifest BEFORE any OPFS write.
     *  Return `false` (or throw) to abort. When omitted, installation proceeds
     *  without a prompt — used for builtin auto-install. */
    consentProvider?: ConsentProvider;
}

export class ToolInstallCancelled extends Error {
    constructor() {
        super('Installation cancelled by user.');
        this.name = 'ToolInstallCancelled';
    }
}

/** Install a tool from a zip Blob/ArrayBuffer. Returns the installed manifest. */
export async function installFromZip(
    input: Blob | ArrayBuffer | Uint8Array,
    options: InstallOptions = {},
): Promise<ToolManifest> {
    const zip = await JSZip.loadAsync(input as never);

    const root = stripCommonPrefix(zip);
    const manifestEntry = root.file('tool.manifest.json');
    if (!manifestEntry) {
        throw new ToolInstallError('zip is missing tool.manifest.json at the root');
    }

    let manifest: ToolManifest;
    try {
        manifest = JSON.parse(await manifestEntry.async('string')) as ToolManifest;
    } catch {
        throw new ToolInstallError('tool.manifest.json is not valid JSON');
    }

    if (!manifest.id || !isValidPathSegment(manifest.id)) {
        throw new ToolInstallError('manifest.id is missing or invalid');
    }
    if (!manifest.name) throw new ToolInstallError('manifest.name is required');
    if (!manifest.version) throw new ToolInstallError('manifest.version is required');

    if (options.consentProvider) {
        const approved = await options.consentProvider(manifest);
        if (!approved) throw new ToolInstallCancelled();
    }

    const files: ToolFile[] = [];
    const entries: Promise<void>[] = [];
    root.forEach((relPath, entry) => {
        if (entry.dir) return;
        const segments = relPath.split('/').filter(Boolean);
        for (const seg of segments) {
            if (!isValidPathSegment(seg)) {
                throw new ToolInstallError(`unsafe path in zip: ${relPath}`);
            }
        }
        entries.push(
            entry.async('uint8array').then((data) => {
                files.push({ path: segments.join('/'), data });
            }),
        );
    });
    await Promise.all(entries);

    await storage.installTool(manifest.id, files);
    eventBus.emit('tool:installed', { toolId: manifest.id, version: manifest.version });
    return manifest;
}

/** Install from a URL (must be CORS-accessible). */
export async function installFromUrl(url: string, options: InstallOptions = {}): Promise<ToolManifest> {
    const res = await fetch(url);
    if (!res.ok) throw new ToolInstallError(`download failed: HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    return installFromZip(buffer, options);
}

/** Install builtins bundled under apps/web/static/builtins/. Returns the ids
 * actually installed during this call (skips ones that were already present). */
export async function installBuiltinsIfMissing(builtinIds: string[]): Promise<string[]> {
    const installed: string[] = [];
    for (const id of builtinIds) {
        const existing = await storage.getToolManifest(id).catch(() => null);
        if (existing) continue;
        try {
            await installFromUrl(`/builtins/${id}.zip`);
            installed.push(id);
        } catch (err) {
            console.warn(`[Pasmello] failed to install builtin "${id}"`, err);
        }
    }
    return installed;
}

/**
 * If every entry in the zip lives under the same top-level directory
 * (common when zipping a folder), descend into it. Otherwise return the root.
 */
function stripCommonPrefix(zip: JSZip): JSZip {
    const topLevel = new Set<string>();
    zip.forEach((relPath) => {
        const head = relPath.split('/')[0];
        if (head) topLevel.add(head);
    });
    if (topLevel.size !== 1) return zip;
    const only = [...topLevel][0];
    if (!zip.folder(only)?.file('tool.manifest.json')) return zip;
    return zip.folder(only)!;
}
