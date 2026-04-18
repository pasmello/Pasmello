import JSZip from 'jszip';
import { storage } from './index.js';

/** Build a zip Blob containing the entire storage tree. */
export async function exportStorageZip(): Promise<Blob> {
    const entries = await storage.exportAll();
    const zip = new JSZip();
    for (const [path, data] of entries) {
        zip.file(path, data);
    }
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Trigger a browser download of the export zip. */
export async function downloadStorageZip(filename = `pasmello-${todayStamp()}.zip`): Promise<void> {
    const blob = await exportStorageZip();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** Restore storage from a zip Blob/File previously produced by exportStorageZip. */
export async function importStorageZip(input: Blob | ArrayBuffer | Uint8Array): Promise<void> {
    const zip = await JSZip.loadAsync(input as never);
    const entries = new Map<string, Uint8Array>();
    const tasks: Promise<void>[] = [];
    zip.forEach((path, entry) => {
        if (entry.dir) return;
        tasks.push(
            entry.async('uint8array').then((data) => {
                entries.set(path, data);
            }),
        );
    });
    await Promise.all(tasks);
    await storage.importAll(entries);
}

function todayStamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
