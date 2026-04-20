import type { Channel } from '@pasmello/sdk';

type TokenListener = (tokens: Record<string, string>) => void;

/**
 * Theme token subscription. Applies tokens to `document.documentElement`
 * automatically on every update so chrome/ambient/workspace iframes pick
 * up the same `--pm-*` variables the host renders with.
 */
export class Tokens {
    private current: Record<string, string> = {};
    private listeners = new Set<TokenListener>();

    constructor(private channel: Channel) {
        this.channel.onMessage('theme:update', (data) => {
            const vars = (data ?? {}) as Record<string, string>;
            this.current = vars;
            const root = document.documentElement;
            for (const [key, value] of Object.entries(vars)) {
                root.style.setProperty(key, value);
            }
            for (const cb of this.listeners) {
                try { cb(vars); }
                catch (err) { console.warn('[theme-sdk] tokens listener failed', err); }
            }
        });
    }

    async initial(): Promise<Record<string, string>> {
        const vars = (await this.channel.request('theme:get')) as Record<string, string>;
        this.current = vars ?? {};
        const root = document.documentElement;
        for (const [key, value] of Object.entries(this.current)) {
            root.style.setProperty(key, value);
        }
        return this.current;
    }

    snapshot(): Record<string, string> {
        return { ...this.current };
    }

    onChange(cb: TokenListener): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }
}
