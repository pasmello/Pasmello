import { browser } from '$app/environment';
import { api } from '$lib/api/client';
import type { ThemeSettings } from '@pasmello/shared';

const STORAGE_KEY = 'pm-theme-settings';

class ThemeSettingsState {
    activeThemeId = $state('advanced');
    colorScheme = $state<'light' | 'dark'>('dark');
    perTheme = $state<Record<string, Record<string, unknown>>>({});

    private syncTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        if (browser) {
            this.loadFromLocalStorage();
            this.applyColorScheme();
            this.syncFromServer();
        }
    }

    private loadFromLocalStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw) as ThemeSettings;
                this.activeThemeId = data.activeTheme ?? 'advanced';
                this.colorScheme = data.colorScheme ?? 'dark';
                this.perTheme = data.perTheme ?? {};
            }
        } catch {
            // Corrupt localStorage, use defaults
        }
    }

    private saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
        } catch {
            // Storage full or unavailable
        }
    }

    private async syncFromServer() {
        try {
            const server = await api.settings.getTheme();
            this.activeThemeId = server.activeTheme;
            this.colorScheme = server.colorScheme;
            this.perTheme = server.perTheme;
            this.saveToLocalStorage();
            this.applyColorScheme();
        } catch {
            // Server unavailable, use localStorage values
        }
    }

    private debouncedSyncToServer() {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            api.settings.updateTheme(this.toJSON()).catch(() => {});
        }, 300);
    }

    private persist() {
        this.saveToLocalStorage();
        this.debouncedSyncToServer();
    }

    private applyColorScheme() {
        document.documentElement.setAttribute('data-theme', this.colorScheme);
    }

    setActiveTheme(id: string) {
        this.activeThemeId = id;
        this.persist();
    }

    setColorScheme(scheme: 'light' | 'dark') {
        this.colorScheme = scheme;
        this.applyColorScheme();
        this.persist();
    }

    toggleColorScheme() {
        this.setColorScheme(this.colorScheme === 'light' ? 'dark' : 'light');
    }

    getThemeSetting(themeId: string, key: string): unknown {
        return this.perTheme[themeId]?.[key];
    }

    setThemeSetting(themeId: string, key: string, value: unknown) {
        if (!this.perTheme[themeId]) {
            this.perTheme[themeId] = {};
        }
        this.perTheme[themeId][key] = value;
        // Trigger reactivity by reassigning
        this.perTheme = { ...this.perTheme };
        this.persist();
    }

    toJSON(): ThemeSettings {
        return {
            activeTheme: this.activeThemeId,
            colorScheme: this.colorScheme,
            perTheme: this.perTheme,
        };
    }
}

export const themeSettings = new ThemeSettingsState();
