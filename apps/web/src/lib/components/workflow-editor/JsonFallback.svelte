<script lang="ts">
    import type { Workflow } from '@pasmello/shared';
    import type { EditorState } from './state/editor.svelte.js';
    import { validateWorkflow } from './state/validate.js';

    let { editor }: { editor: EditorState } = $props();

    let draft = $state('');
    let error = $state<string | null>(null);

    function revert() {
        draft = JSON.stringify(editor.workflow, null, 2);
        error = null;
    }

    $effect(() => {
        void editor.workflow;
        if (draft === '') revert();
    });

    function apply() {
        try {
            const parsed = JSON.parse(draft) as Workflow;
            if (!parsed || typeof parsed !== 'object') throw new Error('must be a JSON object');
            if (!parsed.id) throw new Error('workflow.id is required');
            const issues = validateWorkflow(parsed);
            const errors = issues.filter((i) => i.level === 'error');
            if (errors.length > 0) {
                error = errors.map((e) => e.message).join('; ');
                return;
            }
            editor.replace(parsed);
            error = null;
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
        }
    }
</script>

<div class="json-fallback">
    <div class="toolbar">
        <button onclick={apply}>Apply</button>
        <button onclick={revert}>Revert</button>
        {#if error}<span class="err">{error}</span>{/if}
    </div>
    <textarea bind:value={draft} spellcheck="false"></textarea>
</div>

<style>
    .json-fallback {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        height: 100%;
    }

    .toolbar {
        display: flex;
        gap: var(--pm-space-xs);
        align-items: center;
    }

    button {
        padding: var(--pm-space-xs) var(--pm-space-sm);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border);
        color: var(--pm-text-primary);
        border-radius: var(--pm-radius-sm);
        cursor: pointer;
        font-size: var(--pm-font-size-xs);
    }

    .err {
        color: var(--pm-error);
        font-size: var(--pm-font-size-xs);
    }

    textarea {
        flex: 1;
        min-height: 300px;
        padding: var(--pm-space-sm);
        font-family: var(--pm-font-mono);
        font-size: var(--pm-font-size-sm);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        resize: vertical;
    }

    textarea:focus {
        outline: none;
        border-color: var(--pm-border-focus);
    }
</style>
