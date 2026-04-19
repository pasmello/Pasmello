<script lang="ts">
    import type { WorkflowNode } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const config = $derived(node.config as { ms?: number });

    function patch(ms: number) {
        editor.updateNode(node.id, (n) => ({ ...n, config: { ...n.config, ms } }));
    }
</script>

<div class="pm-form-field">
    <span>Wait (ms)</span>
    <input
        type="number"
        min="0"
        value={config.ms ?? 0}
        oninput={(e) => patch(Math.max(0, Number((e.currentTarget as HTMLInputElement).value) || 0))}
    />
</div>

<style>
    @import './field-styles.css';
</style>
