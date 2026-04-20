<script lang="ts">
    import '../app.css';
    import '$lib/theme/themes/index';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { base } from '$app/paths';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { pluginSettings } from '$lib/state/plugin-settings.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { applyThemeTokens } from '$lib/theme/apply-tokens';
    import { bootstrapApp } from '$lib/bootstrap';
    import { triggerDispatcher } from '$lib/workflow/triggers';
    import AmbientLayer from '$lib/components/iframes/AmbientLayer.svelte';
    import ChromeLayer from '$lib/components/iframes/ChromeLayer.svelte';

    let { children } = $props();

    let currentView = $derived.by(() => {
        const path = $page.url.pathname.slice(base.length) || '/';
        if (path === '/') return 'workspace' as const;
        if (path.startsWith('/tools')) return 'tools' as const;
        if (path.startsWith('/workflows')) return 'workflows' as const;
        if (path.startsWith('/themes')) return 'themes' as const;
        if (path.startsWith('/settings')) return 'settings' as const;
        return 'workspace' as const;
    });

    let renderedThemeId = $state(pluginSettings.activeThemeId);

    $effect(() => {
        if (currentView !== 'settings') {
            renderedThemeId = pluginSettings.activeThemeId;
        }
    });

    let prevView = $state(currentView);
    $effect(() => {
        if (prevView === 'settings' && currentView !== 'settings') {
            renderedThemeId = pluginSettings.activeThemeId;
        }
        prevView = currentView;
    });

    let activeTheme = $derived(themeRegistry.all.find(t => t.manifest.id === renderedThemeId) ?? themeRegistry.active);
    let ThemeShell = $derived(activeTheme?.kind === 'svelte' ? activeTheme.component : null);
    let iframeLayers = $derived(activeTheme?.kind === 'iframe' ? activeTheme.manifest.layers : null);

    let transitioning = $state(false);
    let prevRendered = $state(renderedThemeId);
    $effect(() => {
        if (renderedThemeId !== prevRendered) {
            transitioning = true;
            prevRendered = renderedThemeId;
            setTimeout(() => { transitioning = false; }, 400);
        }
    });

    let bootstrapped = $state(false);

    onMount(async () => {
        await bootstrapApp();
        await workspaceState.loadWorkspace(workspaceState.currentName);
        bridgeManager.init(workspaceState.currentName);
        await triggerDispatcher.init(workspaceState.currentName);
        bootstrapped = true;
    });

    $effect(() => {
        document.documentElement.setAttribute('data-theme', pluginSettings.colorScheme);
    });

    $effect(() => {
        const manifest = themeRegistry.activeManifest;
        const scheme = pluginSettings.colorScheme;
        if (manifest) {
            applyThemeTokens(manifest, scheme);
        }
    });

    $effect(() => {
        pluginSettings.colorScheme;
        bridgeManager.broadcastTheme();
    });

    // Push nav state to chrome layer whenever it changes
    $effect(() => {
        bridgeManager.broadcastNav(currentView, workspaceState.currentName);
    });

    // Push route change to ambient layer
    $effect(() => {
        bridgeManager.broadcastRoute(currentView);
    });

    // Compute content offset for iframe chrome region
    let chromeRegion = $derived(iframeLayers?.chrome.region);
    let chromeSize = $derived(bridgeManager.chromeSizeOverride ?? iframeLayers?.chrome.size ?? 0);
    let contentMarginLeft = $derived(chromeRegion === 'left' ? `${chromeSize}px` : '0');
    let contentMarginTop = $derived(chromeRegion === 'top' ? `${chromeSize}px` : '0');
</script>

<svelte:head>
    <title>Pasmello</title>
</svelte:head>

{#if transitioning}
    <div class="theme-transition-overlay"></div>
{/if}

{#if bootstrapped}
    {#if iframeLayers && bridgeManager.themeBridge}
        {#if iframeLayers.ambient}
            <AmbientLayer
                themeId={renderedThemeId}
                ambient={iframeLayers.ambient}
                bridge={bridgeManager.themeBridge}
            />
        {/if}
        <ChromeLayer
            themeId={renderedThemeId}
            chrome={iframeLayers.chrome}
            bridge={bridgeManager.themeBridge}
        />
        <main class="iframe-theme-content" style:margin-left={contentMarginLeft} style:margin-top={contentMarginTop}>
            {@render children()}
        </main>
    {:else if ThemeShell}
        {#key renderedThemeId}
            <ThemeShell {currentView}>
                {@render children()}
            </ThemeShell>
        {/key}
    {/if}
{:else}
    <div class="boot-loading">Loading…</div>
{/if}

<style>
    .theme-transition-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background-color: var(--pm-bg-primary);
        animation: theme-fade 400ms ease-out forwards;
        pointer-events: none;
    }

    @keyframes theme-fade {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }

    .boot-loading {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
        background-color: var(--pm-bg-primary);
    }

    .iframe-theme-content {
        display: block;
        min-height: 100vh;
        padding: var(--pm-space-lg);
        background-color: var(--pm-bg-primary);
        color: var(--pm-text-primary);
        box-sizing: border-box;
        overflow-y: auto;
    }
</style>
