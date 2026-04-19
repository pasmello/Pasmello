<script lang="ts">
    import type { Snippet } from 'svelte';
    import { pluginSettings } from '$lib/state/plugin-settings.svelte';

    interface Props {
        currentView: 'workspace' | 'tools' | 'workflows' | 'themes' | 'settings';
        children: Snippet;
    }

    let { currentView, children }: Props = $props();

    let barVisible = $state(true);
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMouseMove(e: MouseEvent) {
        if (e.clientY < 80) {
            barVisible = true;
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        } else {
            if (!hideTimer) {
                hideTimer = setTimeout(() => {
                    barVisible = false;
                    hideTimer = null;
                }, 3000);
            }
        }
    }

    $effect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
        };
    });

    $effect(() => {
        const accent = pluginSettings.getThemeSetting('cute', 'accentColor') as string | undefined;
        if (accent) {
            document.documentElement.style.setProperty('--pm-accent', accent);
        }
    });

    $effect(() => {
        const bg = pluginSettings.getThemeSetting('cute', 'backgroundColor') as string | undefined;
        if (bg) {
            document.documentElement.style.setProperty('--pm-bg-primary', bg);
        }
    });
</script>

<div class="shell">
    <nav class="floating-bar" class:hidden={!barVisible}>
        <a href="/" class="bar-item" class:active={currentView === 'workspace'}>
            <span class="bar-icon">&#9633;</span>
            <span class="bar-label">Workspace</span>
        </a>
        <a href="/tools" class="bar-item" class:active={currentView === 'tools'}>
            <span class="bar-icon">&#128295;</span>
            <span class="bar-label">Tools</span>
        </a>
        <a href="/workflows" class="bar-item" class:active={currentView === 'workflows'}>
            <span class="bar-icon">&#8644;</span>
            <span class="bar-label">Workflows</span>
        </a>
        <a href="/themes" class="bar-item" class:active={currentView === 'themes'}>
            <span class="bar-icon">&#127912;</span>
            <span class="bar-label">Themes</span>
        </a>
        <a href="/settings" class="bar-item" class:active={currentView === 'settings'}>
            <span class="bar-icon">&#9881;</span>
            <span class="bar-label">Settings</span>
        </a>
        <button class="bar-item theme-btn" onclick={() => pluginSettings.toggleColorScheme()}>
            {pluginSettings.colorScheme === 'dark' ? '☀️' : '🌙'}
        </button>
    </nav>
    <main class="content" class:bar-hidden={!barVisible}>
        {@render children()}
    </main>
</div>

<style>
    .shell {
        min-height: 100vh;
        background-color: var(--pm-bg-primary);
        position: relative;
    }

    .floating-bar {
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 100;
        display: flex;
        align-items: center;
        gap: var(--pm-space-xs);
        padding: 8px 24px;
        background-color: var(--pm-bg-surface);
        border-radius: 28px;
        border: 1px solid var(--pm-border-subtle);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        opacity: 1;
        transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 400ms ease;
    }

    .floating-bar.hidden {
        transform: translateX(-50%) translateY(-120%);
        opacity: 0;
    }

    .bar-item {
        display: flex;
        align-items: center;
        gap: var(--pm-space-xs);
        padding: var(--pm-space-xs) var(--pm-space-md);
        border-radius: 20px;
        color: var(--pm-text-secondary);
        font-size: var(--pm-font-size-sm);
        text-decoration: none;
        transition: all var(--pm-transition-fast);
        background: none;
        border: none;
        cursor: pointer;
    }

    .bar-item:hover {
        color: var(--pm-text-primary);
        background-color: var(--pm-bg-tertiary);
    }

    .bar-item.active {
        color: var(--pm-accent);
        background-color: var(--pm-accent-subtle);
    }

    .bar-icon {
        font-size: var(--pm-font-size-base);
    }

    .bar-label {
        font-weight: 500;
    }

    .theme-btn {
        margin-left: var(--pm-space-sm);
        font-size: var(--pm-font-size-base);
    }

    .content {
        padding-top: 72px;
        padding-left: var(--pm-space-lg);
        padding-right: var(--pm-space-lg);
        padding-bottom: var(--pm-space-lg);
        min-height: 100vh;
        transition: padding-top 400ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .content.bar-hidden {
        padding-top: 16px;
    }
</style>
