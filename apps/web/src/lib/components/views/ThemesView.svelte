<script lang="ts">
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { pluginSettings } from '$lib/state/plugin-settings.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import PluginSettingsRenderer from './PluginSettingsRenderer.svelte';

    let expandedId = $state<string | null>(null);

    function toggleSettings(id: string) {
        expandedId = expandedId === id ? null : id;
    }

    function swatch(tokenMap: Record<string, string> | undefined): string[] {
        if (!tokenMap) return [];
        const picks = [
            '--pm-accent',
            '--pm-bg-primary',
            '--pm-bg-surface',
            '--pm-text-primary',
            '--pm-success',
            '--pm-error',
        ];
        return picks.map((k) => tokenMap[k]).filter((v): v is string => typeof v === 'string').slice(0, 5);
    }

    const themes = $derived(themeRegistry.all);
</script>

<div class="themes-page">
    <div class="page-header">
        <h2>Themes</h2>
        <p class="sub">Active theme for <strong>{workspaceState.currentName}</strong>.</p>
    </div>

    <div class="theme-grid">
        {#each themes as def (def.manifest.id)}
            {@const m = def.manifest}
            {@const active = pluginSettings.activeThemeId === m.id}
            {@const hasSettings = m.settings != null && m.settings.length > 0}
            {@const sw = [...swatch(m.tokens), ...swatch(m.darkTokens)].slice(0, 6)}
            <article class="theme-card" class:active>
                <header>
                    <h3>{m.name}</h3>
                    <div class="badges">
                        <span class="badge source" data-source={def.source}>{def.source}</span>
                        {#if active}<span class="badge active-badge">Active</span>{/if}
                        <span class="badge version">v{m.version}</span>
                    </div>
                </header>
                <p class="desc">{m.description}</p>

                {#if sw.length > 0}
                    <div class="swatch-row">
                        {#each sw as color, i (i)}
                            <span class="swatch" style="background-color: {color};" title={color}></span>
                        {/each}
                    </div>
                {/if}

                <div class="card-actions">
                    {#if !active}
                        <button class="btn primary" onclick={() => pluginSettings.setActiveTheme(m.id)}>
                            Use
                        </button>
                    {/if}
                    {#if hasSettings}
                        <button class="btn" onclick={() => toggleSettings(m.id)}>
                            {expandedId === m.id ? 'Hide settings' : 'Settings'}
                        </button>
                    {/if}
                    <button
                        class="btn danger"
                        disabled={def.source === 'builtin'}
                        title={def.source === 'builtin' ? 'Built-in themes cannot be removed' : ''}
                    >
                        Remove
                    </button>
                </div>

                {#if expandedId === m.id && hasSettings}
                    <div class="expanded-settings">
                        <PluginSettingsRenderer
                            settings={m.settings!}
                            kind="theme"
                            id={m.id}
                        />
                    </div>
                {/if}
            </article>
        {/each}
    </div>

    {#if themes.length === 0}
        <p class="empty">No themes installed.</p>
    {/if}
</div>

<style>
    .themes-page {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-lg);
    }

    .page-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .page-header .sub {
        margin-top: var(--pm-space-xs);
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }

    .theme-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--pm-space-md);
    }

    .theme-card {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-md);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-md);
        transition: border-color var(--pm-transition-fast);
    }

    .theme-card.active {
        border-color: var(--pm-accent);
        box-shadow: 0 0 0 1px var(--pm-accent-subtle);
    }

    .theme-card header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--pm-space-sm);
    }

    .theme-card h3 {
        font-size: var(--pm-font-size-lg);
        font-weight: 600;
    }

    .badges {
        display: flex;
        gap: var(--pm-space-xs);
        flex-wrap: wrap;
    }

    .badge {
        font-size: var(--pm-font-size-xs);
        padding: 2px 8px;
        border-radius: var(--pm-radius-full);
        background-color: var(--pm-bg-tertiary);
        color: var(--pm-text-secondary);
    }

    .badge.source[data-source='builtin'] {
        background-color: var(--pm-accent-subtle);
        color: var(--pm-accent);
    }

    .badge.active-badge {
        background-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }

    .badge.version {
        font-family: var(--pm-font-mono);
    }

    .desc {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
    }

    .swatch-row {
        display: flex;
        gap: 6px;
    }

    .swatch {
        display: inline-block;
        width: 22px;
        height: 22px;
        border-radius: var(--pm-radius-sm);
        border: 1px solid var(--pm-border-subtle);
    }

    .card-actions {
        display: flex;
        gap: var(--pm-space-xs);
        margin-top: auto;
    }

    .btn {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-xs);
        cursor: pointer;
    }

    .btn.primary {
        background-color: var(--pm-accent);
        border-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }

    .btn.danger {
        color: var(--pm-error);
        border-color: var(--pm-error);
        background: none;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .expanded-settings {
        margin-top: var(--pm-space-sm);
        padding-top: var(--pm-space-sm);
        border-top: 1px dashed var(--pm-border-subtle);
    }

    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
    }
</style>
