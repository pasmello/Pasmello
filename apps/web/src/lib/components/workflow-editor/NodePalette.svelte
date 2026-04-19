<script lang="ts">
    import type { WorkflowNodeType } from '@pasmello/shared';
    import { NODE_TYPE_META, PALETTE_ORDER } from './state/palette.js';

    function onDragStart(event: DragEvent, type: WorkflowNodeType) {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData('application/pasmello-node-type', type);
        event.dataTransfer.effectAllowed = 'copy';
    }
</script>

<aside class="palette" aria-label="Node palette">
    <h4>Nodes</h4>
    <p class="hint">Drag onto canvas</p>
    {#each PALETTE_ORDER as type (type)}
        {@const meta = NODE_TYPE_META[type]}
        <div
            class="tile"
            draggable="true"
            style="--accent: var({meta.accentVar});"
            ondragstart={(e) => onDragStart(e, type)}
            role="button"
            tabindex="0"
        >
            <span class="dot"></span>
            <div class="tile-body">
                <span class="tile-label">{meta.label}</span>
                <span class="tile-desc">{meta.description}</span>
            </div>
        </div>
    {/each}
</aside>

<style>
    .palette {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        padding: var(--pm-space-sm);
        background-color: var(--pm-bg-secondary);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
        min-width: 200px;
    }

    h4 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        color: var(--pm-text-primary);
        margin: 0;
    }

    .hint {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
        margin-bottom: var(--pm-space-xs);
    }

    .tile {
        display: flex;
        align-items: flex-start;
        gap: var(--pm-space-xs);
        padding: var(--pm-space-xs) var(--pm-space-sm);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-left: 3px solid var(--accent);
        border-radius: var(--pm-radius-sm);
        cursor: grab;
        transition: background-color var(--pm-transition-fast);
    }

    .tile:hover {
        background-color: var(--pm-bg-surface-raised);
    }

    .tile:active {
        cursor: grabbing;
    }

    .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--accent);
        margin-top: 3px;
        flex-shrink: 0;
    }

    .tile-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .tile-label {
        font-size: var(--pm-font-size-sm);
        font-weight: 500;
        color: var(--pm-text-primary);
    }

    .tile-desc {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
    }
</style>
