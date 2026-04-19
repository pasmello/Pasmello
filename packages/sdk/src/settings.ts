import type { Channel } from './channel.js';

type ChangeListener = (value: unknown) => void;

/**
 * Per-tool, per-workspace settings declared via `ToolManifest.settings`.
 * The host enforces that only declared keys are readable/writable.
 *
 * ```ts
 * const speed = await sdk.settings.get('tickSpeed');
 * sdk.settings.onChange('tickSpeed', (v) => updateUI(v));
 * ```
 */
export class Settings {
    private listeners = new Map<string, Set<ChangeListener>>();

    constructor(private channel: Channel) {
        // Host pushes updates whenever another surface (Settings view,
        // another open tab) changes one of this tool's settings.
        this.channel.onMessage('settings:update', (data) => {
            const payload = data as { key?: string; value?: unknown };
            if (typeof payload?.key !== 'string') return;
            const set = this.listeners.get(payload.key);
            if (!set) return;
            for (const cb of set) {
                try { cb(payload.value); }
                catch (err) { console.warn('[pm-sdk] settings listener failed', err); }
            }
        });
    }

    /** Read a specific setting (falls back to the manifest default). */
    async get(key: string): Promise<unknown> {
        return this.channel.request('settings:get', { key });
    }

    /** Read all of this tool's settings as a `{ key: value }` map. */
    async getAll(): Promise<Record<string, unknown>> {
        const result = await this.channel.request('settings:get', {});
        return (result ?? {}) as Record<string, unknown>;
    }

    /** Persist a setting. Returns `true` if the key is declared on the
     *  tool's manifest (the write was accepted), `false` otherwise. */
    async set(key: string, value: unknown): Promise<boolean> {
        const ok = await this.channel.request('settings:set', { key, value });
        return ok === true;
    }

    /** Subscribe to changes for a specific setting. Returns an unsubscribe fn. */
    onChange(key: string, cb: ChangeListener): () => void {
        let set = this.listeners.get(key);
        if (!set) {
            set = new Set();
            this.listeners.set(key, set);
        }
        set.add(cb);
        return () => set!.delete(cb);
    }
}
