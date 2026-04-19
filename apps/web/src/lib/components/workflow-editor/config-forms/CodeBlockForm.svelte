<script lang="ts">
    import type { WorkflowNode } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const config = $derived(node.config as { code?: string; timeoutMs?: number });

    function patch(part: Partial<typeof config>) {
        editor.updateNode(node.id, (n) => ({ ...n, config: { ...n.config, ...part } }));
    }
</script>

<div class="pm-form-field">
    <span>Code (receives `inputs` map of prior outputs)</span>
    <textarea
        class="code"
        value={config.code ?? ''}
        oninput={(e) => patch({ code: (e.currentTarget as HTMLTextAreaElement).value })}
        spellcheck="false"
        rows="12"
    ></textarea>
</div>

<div class="pm-form-field">
    <span>Timeout (ms)</span>
    <input
        type="number"
        min="0"
        value={config.timeoutMs ?? 30000}
        oninput={(e) => patch({ timeoutMs: Number((e.currentTarget as HTMLInputElement).value) || 0 })}
    />
</div>

<style>
    @import './field-styles.css';
    .code {
        min-height: 160px;
    }
</style>
