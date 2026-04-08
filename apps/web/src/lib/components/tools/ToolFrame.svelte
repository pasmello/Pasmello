<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { HostBridge } from '$lib/sandbox/host-bridge';

    interface Props {
        id: string;
        toolId: string;
        bridge: HostBridge;
    }

    let { id, toolId, bridge }: Props = $props();

    let iframeEl: HTMLIFrameElement;

    onMount(() => {
        if (iframeEl) {
            bridge.mount(id, toolId, iframeEl);
        }
    });

    onDestroy(() => {
        bridge.unmount(id);
    });
</script>

<div class="tool-frame">
    <iframe
        bind:this={iframeEl}
        sandbox="allow-scripts"
        src="/api/v1/tools/{toolId}/serve/"
        title="Tool: {toolId}"
    ></iframe>
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
</style>
