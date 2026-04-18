import { OpfsStorage } from './opfs.js';
import type { Storage } from './types.js';

export type { Storage, ToolFile } from './types.js';
export { OpfsStorage } from './opfs.js';
export { isValidPathSegment, assertPathSegment, InvalidPathSegmentError } from './types.js';

export const storage: Storage = new OpfsStorage();
