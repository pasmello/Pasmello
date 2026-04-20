import JSZip from 'jszip';
import type { ToolManifest, ThemeManifest } from '@pasmello/shared';
import { base } from '$app/paths';
import { storage, isValidPathSegment, type ToolFile } from '$lib/storage';
import { eventBus } from '$lib/workflow/triggers';

export class ToolInstallError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolInstallError';
    }
}

export type ConsentProvider = (manifest: ToolManifest) => Promise<boolean>;
export type ThemeConsentProvider = (manifest: ThemeManifest) => Promise<boolean>;

export interface InstallOptions {
    /** If provided, called with the parsed manifest BEFORE any OPFS write.
     *  Return `false` (or throw) to abort. When omitted, installation proceeds
     *  without a prompt — used for builtin auto-install. */
    consentProvider?: ConsentProvider;
}

export interface ThemeInstallOptions {
    consentProvider?: ThemeConsentProvider;
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

/** Fetch a builtin zip bypassing the browser cache. Static hosts (GitHub
 *  Pages, Cloudflare Pages, …) typically set short `max-age` on static files,
 *  but that's still enough to miss a post-deploy version bump and leave users
 *  stuck on an old chrome. `cache: 'no-store'` bypasses that. */
async function fetchBuiltinZip(url: string): Promise<ArrayBuffer | null> {
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.arrayBuffer();
    } catch {
        return null;
    }
}

/** Peek at a bundled tool zip's manifest version without writing to OPFS. */
async function peekBundledToolVersion(url: string): Promise<string | null> {
    try {
        const buffer = await fetchBuiltinZip(url);
        if (!buffer) return null;
        const zip = await JSZip.loadAsync(buffer);
        const root = stripCommonPrefix(zip);
        const entry = root.file('tool.manifest.json');
        if (!entry) return null;
        const manifest = JSON.parse(await entry.async('string')) as ToolManifest;
        return manifest.version ?? null;
    } catch {
        return null;
    }
}

/** Install builtins bundled under apps/web/static/builtins/. Returns the ids
 * actually installed during this call. Reinstalls when the shipped version
 * differs from what's already in OPFS. */
export async function installBuiltinsIfMissing(builtinIds: string[]): Promise<string[]> {
    const installed: string[] = [];
    for (const id of builtinIds) {
        const url = `${base}/builtins/${id}.zip`;
        const existing = await storage.getToolManifest(id).catch(() => null);
        if (existing) {
            const bundled = await peekBundledToolVersion(url);
            if (!bundled || bundled === existing.version) continue;
        }
        try {
            const buffer = await fetchBuiltinZip(url);
            if (!buffer) {
                console.warn(`[Pasmello] builtin "${id}" fetch returned empty`);
                continue;
            }
            await installFromZip(buffer);
            installed.push(id);
        } catch (err) {
            console.warn(`[Pasmello] failed to install builtin "${id}"`, err);
        }
    }
    return installed;
}

/** Install a theme from a zip. Mirrors installFromZip for tools. */
export async function installThemeFromZip(
    input: Blob | ArrayBuffer | Uint8Array,
    options: ThemeInstallOptions = {},
): Promise<ThemeManifest> {
    const zip = await JSZip.loadAsync(input as never);

    const root = stripCommonPrefix(zip, 'theme.manifest.json');
    const manifestEntry = root.file('theme.manifest.json');
    if (!manifestEntry) {
        throw new ToolInstallError('zip is missing theme.manifest.json at the root');
    }

    let manifest: ThemeManifest;
    try {
        manifest = JSON.parse(await manifestEntry.async('string')) as ThemeManifest;
    } catch {
        throw new ToolInstallError('theme.manifest.json is not valid JSON');
    }

    if (!manifest.id || !isValidPathSegment(manifest.id)) {
        throw new ToolInstallError('manifest.id is missing or invalid');
    }
    if (!manifest.name) throw new ToolInstallError('manifest.name is required');
    if (!manifest.version) throw new ToolInstallError('manifest.version is required');
    if (!manifest.layers?.chrome?.entry) {
        throw new ToolInstallError('manifest.layers.chrome.entry is required');
    }

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

    await storage.installTheme(manifest.id, files);
    eventBus.emit('theme:installed', { themeId: manifest.id, version: manifest.version });
    return manifest;
}

export async function installThemeFromUrl(url: string, options: ThemeInstallOptions = {}): Promise<ThemeManifest> {
    const res = await fetch(url);
    if (!res.ok) throw new ToolInstallError(`download failed: HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    return installThemeFromZip(buffer, options);
}

/** Peek at the bundled zip's manifest without committing to OPFS. Used to
 *  decide whether the shipped builtin version is newer than what's installed.
 *  Bypasses browser cache so a post-deploy bump is always seen. */
async function peekBundledThemeVersion(url: string): Promise<string | null> {
    try {
        const buffer = await fetchBuiltinZip(url);
        if (!buffer) return null;
        const zip = await JSZip.loadAsync(buffer);
        const root = stripCommonPrefix(zip, 'theme.manifest.json');
        const entry = root.file('theme.manifest.json');
        if (!entry) return null;
        const manifest = JSON.parse(await entry.async('string')) as ThemeManifest;
        return manifest.version ?? null;
    } catch {
        return null;
    }
}

export async function installBuiltinThemesIfMissing(builtinIds: string[]): Promise<string[]> {
    const installed: string[] = [];
    for (const id of builtinIds) {
        const url = `${base}/builtin-themes/${id}.zip`;
        const existing = await storage.getThemeManifest(id).catch(() => null);
        if (existing) {
            const bundled = await peekBundledThemeVersion(url);
            if (!bundled || bundled === existing.version) continue;
        }
        try {
            const buffer = await fetchBuiltinZip(url);
            if (!buffer) {
                console.warn(`[Pasmello] builtin theme "${id}" fetch returned empty`);
                continue;
            }
            await installThemeFromZip(buffer);
            installed.push(id);
        } catch (err) {
            console.warn(`[Pasmello] failed to install builtin theme "${id}"`, err);
        }
    }
    return installed;
}

/**
 * If every entry in the zip lives under the same top-level directory
 * (common when zipping a folder), descend into it. Otherwise return the root.
 */
function stripCommonPrefix(zip: JSZip, manifestFile = 'tool.manifest.json'): JSZip {
    const topLevel = new Set<string>();
    zip.forEach((relPath) => {
        const head = relPath.split('/')[0];
        if (head) topLevel.add(head);
    });
    if (topLevel.size !== 1) return zip;
    const only = [...topLevel][0];
    if (!zip.folder(only)?.file(manifestFile)) return zip;
    return zip.folder(only)!;
}
