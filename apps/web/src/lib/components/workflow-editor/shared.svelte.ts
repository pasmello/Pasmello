import type { EditorState } from './state/editor.svelte.js';

/** Module-level ref so deeply-nested components (Svelte Flow custom nodes) can
 *  reach the active editor instance without threading props through. */
export const editorInstance = $state<{ current: EditorState | null }>({ current: null });
