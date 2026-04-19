<script lang="ts">
    import type { WorkflowNode } from '@pasmello/shared';
    import type { EditorState } from '../state/editor.svelte.js';

    let { node, editor }: { node: WorkflowNode; editor: EditorState } = $props();

    const config = $derived(node.config as {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    });

    function patch(part: Partial<typeof config>) {
        editor.updateNode(node.id, (n) => ({ ...n, config: { ...n.config, ...part } }));
    }

    let headersJson = $state('{}');
    let headersError = $state<string | null>(null);

    $effect(() => {
        headersJson = JSON.stringify((node.config as { headers?: unknown }).headers ?? {}, null, 2);
    });

    function commitHeaders(text: string) {
        try {
            const parsed = JSON.parse(text);
            headersError = null;
            patch({ headers: parsed });
        } catch (err) {
            headersError = err instanceof Error ? err.message : String(err);
        }
    }
</script>

<div class="pm-form-field">
    <span>URL</span>
    <input
        type="text"
        value={config.url ?? ''}
        oninput={(e) => patch({ url: (e.currentTarget as HTMLInputElement).value })}
        placeholder="https://api.example.com/foo"
    />
</div>

<div class="pm-form-field">
    <span>Method</span>
    <select value={config.method ?? 'GET'} onchange={(e) => patch({ method: (e.currentTarget as HTMLSelectElement).value })}>
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>DELETE</option>
    </select>
</div>

<div class="pm-form-field">
    <span>Headers (JSON)</span>
    <textarea bind:value={headersJson} onblur={() => commitHeaders(headersJson)} spellcheck="false"></textarea>
    {#if headersError}<span class="err">{headersError}</span>{/if}
</div>

<div class="pm-form-field">
    <span>Body</span>
    <textarea
        value={config.body ?? ''}
        oninput={(e) => patch({ body: (e.currentTarget as HTMLTextAreaElement).value })}
        spellcheck="false"
        placeholder="request body (string)"
    ></textarea>
</div>

<style>
    @import './field-styles.css';
    .err { color: var(--pm-error); }
</style>
