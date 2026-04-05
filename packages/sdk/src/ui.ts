import type { Channel } from './channel.js';

/**
 * UI utilities for tools — theme variable injection, notifications, etc.
 */
export class UI {
    constructor(private channel: Channel) {
        // Listen for theme updates from the host
        this.channel.onMessage('theme:update', (data) => {
            const vars = data as Record<string, string>;
            this.applyThemeVars(vars);
        });
    }

    /** Request current theme variables from the host. */
    async getTheme(): Promise<Record<string, string>> {
        const result = await this.channel.request('theme:get');
        return result as Record<string, string>;
    }

    /** Show a notification via the host. */
    async notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
        await this.channel.request('ui:notify', { message, type });
    }

    /** Apply CSS custom properties to the tool's document root. */
    private applyThemeVars(vars: Record<string, string>): void {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
    }
}
