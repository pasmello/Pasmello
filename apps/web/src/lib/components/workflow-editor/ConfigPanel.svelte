<script lang="ts">
    import type { EditorState } from './state/editor.svelte.js';
    import ToolActionForm from './config-forms/ToolActionForm.svelte';
    import HttpRequestForm from './config-forms/HttpRequestForm.svelte';
    import CodeBlockForm from './config-forms/CodeBlockForm.svelte';
    import ConditionalForm from './config-forms/ConditionalForm.svelte';
    import DelayForm from './config-forms/DelayForm.svelte';
    import TransformForm from './config-forms/TransformForm.svelte';
    import SharedErrorRetryFields from './config-forms/SharedErrorRetryFields.svelte';

    let { editor }: { editor: EditorState } = $props();

    const node = $derived(editor.selectedNode());

    let idDraft = $state('');
    let idError = $state<string | null>(null);

    $effect(() => {
        idDraft = node?.id ?? '';
        idError = null;
    });

    function commitRename() {
        if (!node) return;
        const err = editor.renameNode(node.id, idDraft);
        idError = err;
    }

    function onDelete() {
        if (!node) return;
        if (!confirm(`Delete node "${node.id}"?`)) return;
        editor.removeNode(node.id);
    }
</script>

<aside class="config-panel">
    {#if node}
        <header>
            <h4>{node.type}</h4>
            <button class="delete" onclick={onDelete}>Delete</button>
        </header>

        <div class="pm-form-field">
            <span>Node id</span>
            <input
                type="text"
                bind:value={idDraft}
                onblur={commitRename}
                onkeydown={(e) => { if (e.key === 'Enter') commitRename(); }}
            />
            {#if idError}<span class="err">{idError}</span>{/if}
        </div>

        {#if node.type === 'tool-action'}
            <ToolActionForm {node} {editor} />
        {:else if node.type === 'http-request'}
            <HttpRequestForm {node} {editor} />
        {:else if node.type === 'code-block'}
            <CodeBlockForm {node} {editor} />
        {:else if node.type === 'conditional'}
            <ConditionalForm {node} {editor} />
        {:else if node.type === 'delay'}
            <DelayForm {node} {editor} />
        {:else if node.type === 'transform'}
            <TransformForm {node} {editor} />
        {/if}

        <SharedErrorRetryFields {node} {editor} />
    {:else}
        <p class="empty">Select a node to edit its config.</p>
    {/if}
</aside>

<style>
    @import './config-forms/field-styles.css';

    .config-panel {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-sm);
        padding: var(--pm-space-sm);
        background-color: var(--pm-bg-secondary);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        min-width: 280px;
        max-width: 340px;
        overflow-y: auto;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    h4 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        color: var(--pm-text-primary);
        margin: 0;
        font-family: var(--pm-font-mono);
    }

    .delete {
        background: none;
        border: 1px solid var(--pm-error);
        color: var(--pm-error);
        font-size: var(--pm-font-size-xs);
        padding: 2px var(--pm-space-xs);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
    }

    .empty {
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
        padding: var(--pm-space-md);
    }

    .err { color: var(--pm-error); font-size: var(--pm-font-size-xs); }
</style>
