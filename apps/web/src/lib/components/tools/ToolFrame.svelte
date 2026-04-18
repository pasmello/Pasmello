<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { HostBridge } from '$lib/sandbox/host-bridge';
    import { storage } from '$lib/storage';

    interface Props {
        id: string;
        toolId: string;
        bridge: HostBridge;
    }

    let { id, toolId, bridge }: Props = $props();

    let iframeEl: HTMLIFrameElement | undefined = $state();
    let srcdoc = $state<string | null>(null);
    let loadError = $state<string | null>(null);
    let mounted = false;

    onMount(async () => {
        try {
            const bytes = await storage.readToolFile(toolId, 'dist/index.html');
            if (!bytes) {
                loadError = `tool "${toolId}" has no dist/index.html in storage`;
                return;
            }
            srcdoc = new TextDecoder().decode(bytes);
        } catch (err) {
            loadError = err instanceof Error ? err.message : String(err);
        }
    });

    $effect(() => {
        if (srcdoc !== null && iframeEl && !mounted) {
            mounted = true;
            bridge.mount(id, toolId, iframeEl);
        }
    });

    onDestroy(() => {
        if (mounted) bridge.unmount(id);
    });
</script>

<div class="tool-frame">
    {#if loadError}
        <div class="tool-message error">Failed to load: {loadError}</div>
    {:else if srcdoc !== null}
        <iframe
            bind:this={iframeEl}
            sandbox="allow-scripts"
            {srcdoc}
            title="Tool: {toolId}"
        ></iframe>
    {:else}
        <div class="tool-message">Loading…</div>
    {/if}
</div>

<style>
    .tool-frame {
        width: 100%;
        height: 100%;
        border-radius: var(--pm-radius-md);
        overflow: hidden;
        border: 1px solid var(--pm-border-subtle);
        background-color: var(--pm-bg-surface);
    }

    iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .tool-message {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
        padding: var(--pm-space-md);
        text-align: center;
    }

    .tool-message.error {
        color: var(--pm-status-error);
    }
</style>
