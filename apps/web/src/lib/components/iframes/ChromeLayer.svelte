<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { HostBridge } from '$lib/sandbox/host-bridge';
    import { storage } from '$lib/storage';
    import type { ThemeChromeLayer } from '@pasmello/shared';

    interface Props {
        themeId: string;
        chrome: ThemeChromeLayer;
        bridge: HostBridge;
    }

    let { themeId, chrome, bridge }: Props = $props();

    let iframeEl: HTMLIFrameElement | undefined = $state();
    let srcdoc = $state<string | null>(null);
    let loadError = $state<string | null>(null);
    const mountId = `chrome-${Math.random().toString(36).slice(2, 10)}`;
    let mounted = false;

    onMount(async () => {
        try {
            const bytes = await storage.readThemeFile(themeId, chrome.entry);
            if (!bytes) {
                loadError = `theme "${themeId}" has no ${chrome.entry}`;
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
            bridge.mount(mountId, themeId, iframeEl, { layer: 'chrome' });
        }
    });

    onDestroy(() => {
        if (mounted) bridge.unmount(mountId);
    });
</script>

<div class="chrome-layer chrome-{chrome.region}" style:--chrome-size="{chrome.size}px">
    {#if loadError}
        <div class="layer-error">Chrome failed: {loadError}</div>
    {:else if srcdoc !== null}
        <iframe
            bind:this={iframeEl}
            sandbox="allow-scripts"
            {srcdoc}
            title="Theme chrome: {themeId}"
        ></iframe>
    {/if}
</div>

<style>
    .chrome-layer {
        position: fixed;
        z-index: 1000;
    }

    .chrome-top {
        top: 0;
        left: 0;
        right: 0;
        height: var(--chrome-size);
    }

    .chrome-left {
        top: 0;
        bottom: 0;
        left: 0;
        width: var(--chrome-size);
    }

    .chrome-floating {
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
    }

    .chrome-floating iframe {
        pointer-events: auto;
    }

    iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
    }

    .layer-error {
        padding: var(--pm-space-sm);
        background-color: var(--pm-status-error);
        color: var(--pm-text-inverse);
        font-size: var(--pm-font-size-sm);
    }
</style>
