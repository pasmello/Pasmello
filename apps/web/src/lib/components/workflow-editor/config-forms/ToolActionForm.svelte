<script lang="ts">
    import type { WorkflowNode } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';
    import { toolsState } from '$lib/state/tools.svelte';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const config = $derived(node.config as { toolId?: string; action?: string; inputs?: Record<string, unknown> });

    function patch(part: Partial<typeof config>) {
        editor.updateNode(node.id, (n) => ({ ...n, config: { ...n.config, ...part } }));
    }

    let inputsJson = $state('{}');
    let inputsError = $state<string | null>(null);

    $effect(() => {
        inputsJson = JSON.stringify((node.config as { inputs?: unknown }).inputs ?? {}, null, 2);
    });

    function commitInputs(text: string) {
        try {
            const parsed = JSON.parse(text);
            inputsError = null;
            patch({ inputs: parsed });
        } catch (err) {
            inputsError = err instanceof Error ? err.message : String(err);
        }
    }

    const availableActions = $derived.by(() => {
        const tool = toolsState.installed.find((t) => t.id === config.toolId);
        return tool?.actions ? Object.keys(tool.actions) : [];
    });
</script>

<div class="pm-form-field">
    <span>Tool</span>
    <select value={config.toolId ?? ''} onchange={(e) => patch({ toolId: (e.currentTarget as HTMLSelectElement).value })}>
        <option value="">—</option>
        {#each toolsState.installed as t (t.id)}
            <option value={t.id}>{t.name} ({t.id})</option>
        {/each}
    </select>
</div>

<div class="pm-form-field">
    <span>Action</span>
    {#if availableActions.length > 0}
        <select value={config.action ?? ''} onchange={(e) => patch({ action: (e.currentTarget as HTMLSelectElement).value })}>
            <option value="">—</option>
            {#each availableActions as name (name)}
                <option value={name}>{name}</option>
            {/each}
        </select>
    {:else}
        <input
            type="text"
            value={config.action ?? ''}
            oninput={(e) => patch({ action: (e.currentTarget as HTMLInputElement).value })}
            placeholder="action name"
        />
    {/if}
</div>

<div class="pm-form-field">
    <span>Inputs (JSON)</span>
    <textarea bind:value={inputsJson} onblur={() => commitInputs(inputsJson)} spellcheck="false"></textarea>
    {#if inputsError}
        <span class="err">{inputsError}</span>
    {/if}
</div>

<style>
    @import './field-styles.css';
    .err {
        color: var(--pm-error);
    }
</style>
