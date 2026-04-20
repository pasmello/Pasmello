<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { HostBridge } from '$lib/sandbox/host-bridge';
    import { storage } from '$lib/storage';
    import type { ThemeWorkspaceLayer } from '@pasmello/shared';

    interface Props {
        themeId: string;
        workspace: ThemeWorkspaceLayer;
        bridge: HostBridge;
    }

    let { themeId, workspace, bridge }: Props = $props();

    let iframeEl: HTMLIFrameElement | undefined = $state();
    let srcdoc = $state<string | null>(null);
    const mountId = `workspace-${Math.random().toString(36).slice(2, 10)}`;
    let mounted = false;

    onMount(async () => {
        const bytes = await storage.readThemeFile(themeId, workspace.entry).catch(() => null);
        if (bytes) srcdoc = new TextDecoder().decode(bytes);
    });

    $effect(() => {
        if (srcdoc !== null && iframeEl && !mounted) {
            mounted = true;
            bridge.mount(mountId, themeId, iframeEl, { layer: 'workspace' });
        }
    });

    onDestroy(() => {
        if (mounted) bridge.unmount(mountId);
    });
</script>

<div class="workspace-layer">
    {#if srcdoc !== null}
        <iframe
            bind:this={iframeEl}
            sandbox="allow-scripts"
            {srcdoc}
            title="Theme workspace: {themeId}"
        ></iframe>
    {/if}
</div>

<style>
    .workspace-layer {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
    }

    .workspace-layer iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        pointer-events: auto;
    }
</style>
