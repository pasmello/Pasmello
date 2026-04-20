<script lang="ts">
    import type { ToolManifest, ThemeManifest, PluginPermissions, PluginKind } from '@pasmello/shared';

    interface Props {
        manifest: ToolManifest | ThemeManifest;
        kind: PluginKind;
        onresolve: (accepted: boolean) => void;
    }

    let { manifest, kind, onresolve }: Props = $props();

    type Line = { label: string; detail?: string };

    function summarize(p: PluginPermissions | undefined): Line[] {
        const lines: Line[] = [];
        if (!p) {
            lines.push({ label: 'No additional permissions declared' });
            return lines;
        }
        if (p.network && p.network.length > 0) {
            lines.push({ label: 'Network access', detail: p.network.join(', ') });
        } else {
            lines.push({ label: 'No network access' });
        }
        lines.push({
            label: 'Storage',
            detail: p.storage === 'none'
                ? 'none'
                : `${p.storage} (scoped to this workspace + ${kind})`,
        });
        if (p.clipboard !== 'none') lines.push({ label: 'Clipboard', detail: p.clipboard });
        if (p.notifications) lines.push({ label: 'Desktop notifications' });
        if (p.camera) lines.push({ label: 'Camera' });
        if (p.geolocation) lines.push({ label: 'Geolocation' });
        return lines;
    }

    function layerSummary(m: ThemeManifest): string[] {
        const layers = m.layers;
        if (!layers) return [];
        const parts: string[] = [];
        parts.push(`chrome (${layers.chrome.region}${layers.chrome.size ? `, ${layers.chrome.size}px` : ''})`);
        if (layers.ambient) parts.push('ambient background');
        if (layers.workspace) parts.push('workspace tile layer');
        return parts;
    }

    const isTheme = $derived(kind === 'theme');
    const lines = $derived(summarize(manifest.permissions));
    const themeLayers = $derived(isTheme ? layerSummary(manifest as ThemeManifest) : []);
    const heading = $derived(isTheme ? `Install theme "${manifest.name}"?` : `Install "${manifest.name}"?`);
    const requestsLabel = $derived(isTheme ? 'This theme requests:' : 'This tool requests:');

    function cancel() { onresolve(false); }
    function accept() { onresolve(true); }
</script>

<div class="backdrop" role="presentation" onclick={cancel}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="modal"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="pm-consent-title"
        onclick={(e) => e.stopPropagation()}
    >
        <h3 id="pm-consent-title">{heading}</h3>
        <p class="sub">
            <span class="id">{manifest.id}</span>
            <span class="sep">·</span>
            <span>v{manifest.version}</span>
        </p>
        {#if manifest.description}
            <p class="desc">{manifest.description}</p>
        {/if}

        {#if themeLayers.length > 0}
            <div class="perms">
                <h4>This theme adds:</h4>
                <ul>
                    {#each themeLayers as layer (layer)}
                        <li><span class="perm-label">{layer}</span></li>
                    {/each}
                </ul>
            </div>
        {/if}

        <div class="perms">
            <h4>{requestsLabel}</h4>
            <ul>
                {#each lines as line (line.label)}
                    <li>
                        <span class="perm-label">{line.label}</span>
                        {#if line.detail}
                            <span class="perm-detail">{line.detail}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>

        <div class="actions">
            <button class="btn" onclick={cancel}>Cancel</button>
            <button class="btn primary" onclick={accept}>Install</button>
        </div>
    </div>
</div>

<style>
    .backdrop {
        position: fixed;
        inset: 0;
        background-color: var(--pm-bg-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
    }

    .modal {
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-lg);
        padding: var(--pm-space-lg);
        max-width: 480px;
        width: calc(100% - var(--pm-space-lg) * 2);
        box-shadow: var(--pm-shadow-lg);
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
    }

    h3 {
        font-size: var(--pm-font-size-lg);
        font-weight: 600;
    }

    .sub {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        display: flex;
        gap: var(--pm-space-xs);
    }

    .id {
        font-family: var(--pm-font-mono);
    }

    .sep {
        opacity: 0.5;
    }

    .desc {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-secondary);
    }

    .perms {
        margin-top: var(--pm-space-sm);
        padding-top: var(--pm-space-sm);
        border-top: 1px solid var(--pm-border-subtle);
    }

    .perms h4 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        margin-bottom: var(--pm-space-xs);
        color: var(--pm-text-secondary);
    }

    ul {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
    }

    li {
        display: flex;
        justify-content: space-between;
        gap: var(--pm-space-sm);
        font-size: var(--pm-font-size-sm);
    }

    .perm-label {
        color: var(--pm-text-primary);
        font-weight: 500;
    }

    .perm-detail {
        color: var(--pm-text-tertiary);
        font-family: var(--pm-font-mono);
        font-size: var(--pm-font-size-xs);
        text-align: right;
        word-break: break-all;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--pm-space-sm);
        margin-top: var(--pm-space-md);
    }

    .btn {
        padding: var(--pm-space-xs) var(--pm-space-lg);
        background-color: var(--pm-bg-tertiary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
    }

    .btn.primary {
        background-color: var(--pm-accent);
        border-color: var(--pm-accent);
        color: var(--pm-text-inverse);
    }
</style>
