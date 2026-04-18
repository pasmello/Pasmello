<script lang="ts">
    import '../app.css';
    import '$lib/theme/themes/index';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { bridgeManager } from '$lib/sandbox/bridge.svelte';
    import { workspaceState } from '$lib/state/workspace.svelte';
    import { themeSettings } from '$lib/theme/settings.svelte';
    import { themeRegistry } from '$lib/theme/registry.svelte';
    import { applyThemeTokens } from '$lib/theme/apply-tokens';
    import { bootstrapApp } from '$lib/bootstrap';

    let { children } = $props();

    let currentView = $derived(
        $page.url.pathname === '/' ? 'workspace' as const :
        $page.url.pathname.startsWith('/tools') ? 'tools' as const :
        $page.url.pathname.startsWith('/settings') ? 'settings' as const :
        'workspace' as const
    );

    // Defer shell swap while on settings page.
    // Tokens (colors/fonts) update immediately, but the shell layout
    // only changes when navigating away from settings.
    let renderedThemeId = $state(themeSettings.activeThemeId);

    $effect(() => {
        if (currentView !== 'settings') {
            renderedThemeId = themeSettings.activeThemeId;
        }
    });

    // When navigating away from settings, pick up any pending theme switch
    let prevView = $state(currentView);
    $effect(() => {
        if (prevView === 'settings' && currentView !== 'settings') {
            renderedThemeId = themeSettings.activeThemeId;
        }
        prevView = currentView;
    });

    let ThemeShell = $derived(
        themeRegistry.all.find(t => t.manifest.id === renderedThemeId)?.component
        ?? themeRegistry.activeComponent
    );

    // Transition overlay when shell actually swaps
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
        bridgeManager.init(workspaceState.currentName);
        bootstrapped = true;
    });

    // Apply CSS tokens immediately when theme or color scheme changes
    // (this is what gives instant color preview on settings page)
    $effect(() => {
        const manifest = themeRegistry.activeManifest;
        const scheme = themeSettings.colorScheme;
        if (manifest) {
            applyThemeTokens(manifest, scheme);
        }
    });

    // Broadcast theme to tool iframes
    $effect(() => {
        themeSettings.colorScheme;
        bridgeManager.broadcastTheme();
    });
</script>

<svelte:head>
    <title>Pasmello</title>
</svelte:head>

{#if transitioning}
    <div class="theme-transition-overlay"></div>
{/if}

{#if bootstrapped}
    {#key renderedThemeId}
        <ThemeShell {currentView}>
            {@render children()}
        </ThemeShell>
    {/key}
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
</style>
