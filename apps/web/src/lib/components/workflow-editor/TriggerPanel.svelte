<script lang="ts">
    import type { EventFilter, WorkflowTrigger } from '@pasmello/shared';
    import { EVENT_CATALOG, getEventEntry } from '$lib/workflow/events';
    import type { EditorState } from './state/editor.svelte.js';

    let { editor }: { editor: EditorState } = $props();

    const triggers = $derived(editor.workflow.triggers);

    function addManual() {
        editor.setTriggers([...triggers, { type: 'manual' }]);
    }

    function addUiEvent() {
        editor.setTriggers([...triggers, { type: 'ui-event', event: '' }]);
    }

    function removeAt(idx: number) {
        editor.setTriggers(triggers.filter((_, i) => i !== idx));
    }

    function updateAt(idx: number, t: WorkflowTrigger) {
        editor.setTriggers(triggers.map((existing, i) => (i === idx ? t : existing)));
    }

    function setEventName(idx: number, event: string) {
        const t = triggers[idx];
        if (t.type !== 'ui-event') return;
        updateAt(idx, { ...t, event });
    }

    function setFilterPair(idx: number, key: string, rawValue: string) {
        const t = triggers[idx];
        if (t.type !== 'ui-event') return;
        const parsed = parseFilterValue(rawValue);
        const next: EventFilter = { ...(t.filter ?? {}), [key]: parsed };
        updateAt(idx, { ...t, filter: next });
    }

    function renameFilterKey(idx: number, oldKey: string, newKey: string) {
        const t = triggers[idx];
        if (t.type !== 'ui-event' || !t.filter) return;
        if (oldKey === newKey) return;
        const next: EventFilter = {};
        for (const [k, v] of Object.entries(t.filter)) {
            next[k === oldKey ? newKey : k] = v;
        }
        updateAt(idx, { ...t, filter: next });
    }

    function removeFilterKey(idx: number, key: string) {
        const t = triggers[idx];
        if (t.type !== 'ui-event' || !t.filter) return;
        const { [key]: _drop, ...rest } = t.filter;
        void _drop;
        const filter = Object.keys(rest).length === 0 ? undefined : (rest as EventFilter);
        updateAt(idx, { ...t, filter });
    }

    function addFilterKey(idx: number) {
        const t = triggers[idx];
        if (t.type !== 'ui-event') return;
        const filter: EventFilter = { ...(t.filter ?? {}), '': '' };
        updateAt(idx, { ...t, filter });
    }

    function parseFilterValue(raw: string): string | number | boolean | null {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (raw === 'null') return null;
        const n = Number(raw);
        if (raw !== '' && !Number.isNaN(n)) return n;
        return raw;
    }
</script>

<section class="trigger-panel">
    <header>
        <h4>Triggers</h4>
        <div class="add">
            <button onclick={addManual}>+ Manual</button>
            <button onclick={addUiEvent}>+ UI Event</button>
        </div>
    </header>

    {#if triggers.length === 0}
        <p class="empty">No triggers — runnable only via the Run button.</p>
    {/if}

    {#each triggers as t, idx (idx)}
        <div class="trigger">
            <div class="trigger-head">
                <span class="type-badge">{t.type}</span>
                <button class="remove" onclick={() => removeAt(idx)}>×</button>
            </div>

            {#if t.type === 'ui-event'}
                <div class="pm-form-field">
                    <span>Event name</span>
                    <input
                        type="text"
                        list="pm-events-{idx}"
                        value={t.event}
                        oninput={(e) => setEventName(idx, (e.currentTarget as HTMLInputElement).value)}
                        placeholder="e.g. tool:installed"
                    />
                    <datalist id="pm-events-{idx}">
                        {#each EVENT_CATALOG as entry (entry.name)}
                            <option value={entry.name}>{entry.description}</option>
                        {/each}
                    </datalist>
                    {#if getEventEntry(t.event)}
                        <span class="hint">
                            payload: {Object.entries(getEventEntry(t.event)!.payloadSchema).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </span>
                    {/if}
                </div>

                <div class="filter-group">
                    <div class="filter-head">
                        <span>Filter (all keys must match payload)</span>
                        <button class="add-filter" onclick={() => addFilterKey(idx)}>+ field</button>
                    </div>
                    {#if t.filter}
                        {#each Object.entries(t.filter) as [k, v] (k)}
                            <div class="filter-row">
                                <input
                                    class="fk"
                                    type="text"
                                    value={k}
                                    placeholder="key"
                                    onblur={(e) => renameFilterKey(idx, k, (e.currentTarget as HTMLInputElement).value)}
                                />
                                <input
                                    class="fv"
                                    type="text"
                                    value={String(v ?? '')}
                                    placeholder="value"
                                    oninput={(e) => setFilterPair(idx, k, (e.currentTarget as HTMLInputElement).value)}
                                />
                                <button class="remove" onclick={() => removeFilterKey(idx, k)}>×</button>
                            </div>
                        {/each}
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
</section>

<style>
    @import './config-forms/field-styles.css';

    .trigger-panel {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        padding: var(--pm-space-sm);
        background-color: var(--pm-bg-secondary);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pm-space-xs);
    }

    h4 {
        font-size: var(--pm-font-size-sm);
        font-weight: 600;
        margin: 0;
    }

    .add {
        display: flex;
        gap: var(--pm-space-xs);
    }

    .add button,
    .add-filter {
        padding: 2px var(--pm-space-xs);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        color: var(--pm-text-primary);
        font-size: var(--pm-font-size-xs);
        cursor: pointer;
    }

    .trigger {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        padding: var(--pm-space-xs);
        background-color: var(--pm-bg-surface);
        border: 1px solid var(--pm-border-subtle);
        border-radius: var(--pm-radius-sm);
    }

    .trigger-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .type-badge {
        font-size: var(--pm-font-size-xs);
        font-family: var(--pm-font-mono);
        color: var(--pm-text-secondary);
    }

    .remove {
        background: none;
        border: none;
        color: var(--pm-text-tertiary);
        font-size: var(--pm-font-size-sm);
        cursor: pointer;
    }

    .hint { color: var(--pm-text-tertiary); font-size: var(--pm-font-size-xs); }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: var(--pm-space-xs);
        padding-top: var(--pm-space-xs);
        border-top: 1px dashed var(--pm-border-subtle);
    }

    .filter-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-secondary);
    }

    .filter-row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: var(--pm-space-xs);
    }

    .empty {
        font-size: var(--pm-font-size-xs);
        color: var(--pm-text-tertiary);
    }
</style>
