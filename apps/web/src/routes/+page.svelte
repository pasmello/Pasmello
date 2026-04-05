<script lang="ts">
    // Workspace home - will show tool grid
</script>

<div class="workspace">
    <div class="workspace-header">
        <h2>Default Workspace</h2>
    </div>
    <div class="workspace-grid">
        <div class="empty-state">
            <p>No tools installed yet.</p>
            <p class="hint">Go to Tools to add your first tool.</p>
        </div>
    </div>
</div>

<style>
    .workspace {
        height: 100%;
    }

    .workspace-header {
        margin-bottom: var(--pm-space-lg);
    }

    .workspace-header h2 {
        font-size: var(--pm-font-size-2xl);
        font-weight: 600;
    }

    .workspace-grid {
        display: grid;
        gap: var(--pm-space-md);
        min-height: 300px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--pm-space-2xl);
        border: 2px dashed var(--pm-border);
        border-radius: var(--pm-radius-lg);
        color: var(--pm-text-secondary);
        text-align: center;
        gap: var(--pm-space-sm);
    }

    .hint {
        font-size: var(--pm-font-size-sm);
        color: var(--pm-text-tertiary);
    }
</style>
