<script lang="ts">
    import type { PluginSettingDef } from '@pasmello/shared';
    import { pluginSettings } from '$lib/state/plugin-settings.svelte';

    interface Props {
        settings: PluginSettingDef[];
        kind: 'theme' | 'tool';
        id: string;
    }

    let { settings, kind, id }: Props = $props();

    function getValue(setting: PluginSettingDef): unknown {
        const stored = kind === 'theme'
            ? pluginSettings.getThemeSetting(id, setting.key)
            : pluginSettings.getToolSetting(id, setting.key);
        return stored ?? setting.default;
    }

    function setValue(key: string, value: unknown) {
        if (kind === 'theme') pluginSettings.setThemeSetting(id, key, value);
        else pluginSettings.setToolSetting(id, key, value);
    }
</script>

<div class="theme-settings">
    {#each settings as setting (setting.key)}
        <div class="setting-field">
            <label class="setting-label" for="ts-{setting.key}">
                {setting.label}
                {#if setting.description}
                    <span class="setting-desc">{setting.description}</span>
                {/if}
            </label>

            {#if setting.type === 'color'}
                <input
                    id="ts-{setting.key}"
                    type="color"
                    value={String(getValue(setting))}
                    oninput={(e) => setValue(setting.key, e.currentTarget.value)}
                    class="control-color"
                />
            {:else if setting.type === 'toggle'}
                <button
                    id="ts-{setting.key}"
                    class="control-toggle"
                    class:active={Boolean(getValue(setting))}
                    onclick={() => setValue(setting.key, !getValue(setting))}
                >
                    {getValue(setting) ? 'On' : 'Off'}
                </button>
            {:else if setting.type === 'select'}
                <select
                    id="ts-{setting.key}"
                    value={String(getValue(setting))}
                    onchange={(e) => setValue(setting.key, e.currentTarget.value)}
                    class="control-select"
                >
                    {#if setting.options}
                        {#each setting.options as opt}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    {/if}
                </select>
            {:else if setting.type === 'range'}
                <div class="control-range-wrap">
                    <input
                        id="ts-{setting.key}"
                        type="range"
                        value={Number(getValue(setting))}
                        min={setting.min ?? 0}
                        max={setting.max ?? 100}
                        oninput={(e) => setValue(setting.key, Number(e.currentTarget.value))}
                        class="control-range"
                    />
                    <span class="range-value">{getValue(setting)}</span>
                </div>
            {:else if setting.type === 'text'}
                <input
                    id="ts-{setting.key}"
                    type="text"
                    value={String(getValue(setting))}
                    oninput={(e) => setValue(setting.key, e.currentTarget.value)}
                    class="control-text"
                />
            {/if}
        </div>
    {/each}
</div>

<style>
    .theme-settings {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-md);
    }

    .setting-field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pm-space-md);
        padding: var(--pm-space-sm) 0;
    }

    .setting-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--pm-font-size-sm);
        font-weight: 500;
        color: var(--pm-text-primary);
    }

    .setting-desc {
        font-size: var(--pm-font-size-xs);
        font-weight: 400;
        color: var(--pm-text-tertiary);
    }

    .control-color {
        width: 40px;
        height: 32px;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        background: none;
        padding: 2px;
    }

    .control-toggle {
        padding: var(--pm-space-xs) var(--pm-space-md);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-secondary);
        cursor: pointer;
        font-size: var(--pm-font-size-sm);
        transition: all var(--pm-transition-fast);
    }

    .control-toggle.active {
        background-color: var(--pm-accent);
        border-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }

    .control-select {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
    }

    .control-range-wrap {
        display: flex;
        align-items: center;
        gap: var(--pm-space-sm);
    }

    .control-range {
        width: 120px;
        accent-color: var(--pm-accent);
    }

    .range-value {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
        min-width: 32px;
        text-align: right;
    }

    .control-text {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
        width: 160px;
    }
</style>
