import type { Workspace, WorkspaceSettings } from '@pasmello/shared';
import { defaultWorkspaceSettings } from '@pasmello/shared';
import { workspaceState } from './workspace.svelte';
import { bridgeManager } from '$lib/sandbox/bridge.svelte';

function read(): WorkspaceSettings {
    const ws = workspaceState.current;
    if (ws?.settings) return ws.settings;
    return defaultWorkspaceSettings();
}

async function mutate(update: (s: WorkspaceSettings) => WorkspaceSettings): Promise<void> {
    const ws = workspaceState.current;
    if (!ws) return;
    const base: WorkspaceSettings = ws.settings ?? defaultWorkspaceSettings();
    const nextSettings = update({
        ...base,
        themes: { ...base.themes },
        tools: { ...base.tools },
    });
    const next: Workspace = { ...ws, settings: nextSettings };
    await workspaceState.updateWorkspace(next);
}

class PluginSettingsState {
    get activeThemeId(): string {
        return read().activeThemeId;
    }

    get colorScheme(): 'light' | 'dark' {
        return read().colorScheme;
    }

    setActiveTheme(id: string): void {
        void mutate((s) => ({ ...s, activeThemeId: id }));
    }

    setColorScheme(scheme: 'light' | 'dark'): void {
        document.documentElement.setAttribute('data-theme', scheme);
        void mutate((s) => ({ ...s, colorScheme: scheme }));
    }

    toggleColorScheme(): void {
        this.setColorScheme(this.colorScheme === 'light' ? 'dark' : 'light');
    }

    applyColorSchemeAttr(): void {
        document.documentElement.setAttribute('data-theme', this.colorScheme);
    }

    getThemeSetting(themeId: string, key: string): unknown {
        return read().themes[themeId]?.[key];
    }

    setThemeSetting(themeId: string, key: string, value: unknown): void {
        void mutate((s) => ({
            ...s,
            themes: { ...s.themes, [themeId]: { ...(s.themes[themeId] ?? {}), [key]: value } },
        }));
        bridgeManager.broadcastThemeSettingsChange(themeId, key, value);
    }

    getToolSetting(toolId: string, key: string): unknown {
        return read().tools[toolId]?.[key];
    }

    getToolSettings(toolId: string): Record<string, unknown> {
        return { ...(read().tools[toolId] ?? {}) };
    }

    setToolSetting(toolId: string, key: string, value: unknown): void {
        void mutate((s) => ({
            ...s,
            tools: { ...s.tools, [toolId]: { ...(s.tools[toolId] ?? {}), [key]: value } },
        }));
        bridgeManager.broadcastSettingsChange(toolId, key, value);
    }
}

export const pluginSettings = new PluginSettingsState();
