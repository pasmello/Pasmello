<script lang="ts">
    import type { WorkflowNode, NodeErrorPolicy } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const policyKind = $derived(
        node.onError == null
            ? 'default'
            : typeof node.onError === 'string'
                ? node.onError
                : 'goto'
    );

    function setPolicy(kind: 'default' | 'fail' | 'continue' | 'goto') {
        editor.updateNode(node.id, (n) => {
            if (kind === 'default') {
                const { onError: _drop, ...rest } = n;
                void _drop;
                return rest;
            }
            if (kind === 'fail' || kind === 'continue') return { ...n, onError: kind as NodeErrorPolicy };
            return { ...n, onError: { goto: '' } };
        });
    }

    function setGoto(target: string) {
        editor.updateNode(node.id, (n) => ({ ...n, onError: { goto: target } }));
    }

    function setRetryMax(v: number) {
        editor.updateNode(node.id, (n) => {
            if (!v || v <= 0) {
                const { retry: _drop, ...rest } = n;
                void _drop;
                return rest;
            }
            return { ...n, retry: { max: v, delayMs: n.retry?.delayMs ?? 500 } };
        });
    }

    function setRetryDelay(v: number) {
        editor.updateNode(node.id, (n) => {
            if (!n.retry) return n;
            return { ...n, retry: { max: n.retry.max, delayMs: Math.max(0, v) } };
        });
    }

    const gotoTarget = $derived(
        typeof node.onError === 'object' && node.onError ? node.onError.goto : ''
    );
</script>

<fieldset class="shared">
    <legend>Error &amp; Retry</legend>

    <label>
        <span>On error</span>
        <select value={policyKind} onchange={(e) => setPolicy((e.currentTarget as HTMLSelectElement).value as never)}>
            <option value="default">fail (default)</option>
            <option value="fail">fail (explicit)</option>
            <option value="continue">continue</option>
            <option value="goto">goto node…</option>
        </select>
    </label>

    {#if policyKind === 'goto'}
        <label>
            <span>goto target</span>
            <input
                type="text"
                value={gotoTarget}
                oninput={(e) => setGoto((e.currentTarget as HTMLInputElement).value)}
                placeholder="node id"
            />
        </label>
    {/if}

    <label>
        <span>Retry max</span>
        <input
            type="number"
            min="0"
            value={node.retry?.max ?? 0}
            oninput={(e) => setRetryMax(Number((e.currentTarget as HTMLInputElement).value) || 0)}
        />
    </label>

    {#if node.retry}
        <label>
            <span>Retry delay (ms)</span>
            <input
                type="number"
                min="0"
                value={node.retry.delayMs}
                oninput={(e) => setRetryDelay(Number((e.currentTarget as HTMLInputElement).value) || 0)}
            />
        </label>
    {/if}
</fieldset>

<style>
    .shared {
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        padding: var(--pm-space-sm);
        margin-top: var(--pm-space-sm);
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
    }

    legend {
        font-size: var(--pm-font-size-xs);
        font-weight: 600;
        color: var(--pm-text-secondary);
        padding: 0 var(--pm-space-xs);
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--pm-font-size-xs);
    }

    label span {
        color: var(--pm-text-secondary);
    }

    input, select {
        padding: var(--pm-space-xs);
        background-color: var(--pm-bg-primary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-xs);
        font-family: var(--pm-font-sans);
    }

    input:focus, select:focus {
        outline: none;
        border-color: var(--pm-border-focus);
    }
</style>
