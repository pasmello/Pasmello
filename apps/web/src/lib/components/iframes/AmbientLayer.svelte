<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { HostBridge } from '$lib/sandbox/host-bridge';
    import { storage } from '$lib/storage';
    import type { ThemeAmbientLayer } from '@pasmello/shared';

    interface Props {
        themeId: string;
        ambient: ThemeAmbientLayer;
        bridge: HostBridge;
    }

    let { themeId, ambient, bridge }: Props = $props();

    let iframeEl: HTMLIFrameElement | undefined = $state();
    let srcdoc = $state<string | null>(null);
    const mountId = `ambient-${Math.random().toString(36).slice(2, 10)}`;
    let mounted = false;

    onMount(async () => {
        const bytes = await storage.readThemeFile(themeId, ambient.entry).catch(() => null);
        if (bytes) srcdoc = new TextDecoder().decode(bytes);
    });

    $effect(() => {
        if (srcdoc !== null && iframeEl && !mounted) {
            mounted = true;
            bridge.mount(mountId, themeId, iframeEl, { layer: 'ambient' });
        }
    });

    onDestroy(() => {
        if (mounted) bridge.unmount(mountId);
    });
</script>

<div class="ambient-layer">
    {#if srcdoc !== null}
        <iframe
            bind:this={iframeEl}
            sandbox="allow-scripts"
            {srcdoc}
            title="Theme ambient: {themeId}"
        ></iframe>
    {/if}
</div>

<style>
    .ambient-layer {
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        overflow: hidden;
    }

    iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        pointer-events: none;
    }
</style>
