<script lang="ts">
    import type { WorkflowNode } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const config = $derived(node.config as { expression?: string });

    function patch(expression: string) {
        editor.updateNode(node.id, (n) => ({ ...n, config: { ...n.config, expression } }));
    }
</script>

<div class="pm-form-field">
    <span>Expression (evaluates in a Web Worker, returns boolean)</span>
    <textarea
        class="code"
        value={config.expression ?? 'true'}
        oninput={(e) => patch((e.currentTarget as HTMLTextAreaElement).value)}
        spellcheck="false"
        placeholder="inputs.http.body.ok"
    ></textarea>
    <span class="hint">Connect out-edges from the green (true) and red (false) handles.</span>
</div>

<style>
    @import './field-styles.css';
    .code { min-height: 100px; }
    .hint { color: var(--pm-text-tertiary); margin-top: 2px; }
</style>
