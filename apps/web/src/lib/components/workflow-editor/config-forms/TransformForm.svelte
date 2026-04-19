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
    <span>Expression (value returned becomes this node's output)</span>
    <textarea
        class="code"
        value={config.expression ?? 'inputs'}
        oninput={(e) => patch((e.currentTarget as HTMLTextAreaElement).value)}
        spellcheck="false"
        placeholder="inputs.fetch.body"
    ></textarea>
</div>

<style>
    @import './field-styles.css';
    .code { min-height: 100px; }
</style>
