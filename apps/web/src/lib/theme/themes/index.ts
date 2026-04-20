import { themeRegistry } from '../registry.svelte';

import { manifest as advancedManifest } from './advanced/manifest';
import { manifest as monolithicManifest } from './monolithic/manifest';
import { manifest as cuteManifest } from './cute/manifest';

import AdvancedShell from './advanced/Shell.svelte';
import MonolithicShell from './monolithic/Shell.svelte';
import CuteShell from './cute/Shell.svelte';

themeRegistry.register({ manifest: advancedManifest, component: AdvancedShell, source: 'builtin', kind: 'svelte' });
themeRegistry.register({ manifest: monolithicManifest, component: MonolithicShell, source: 'builtin', kind: 'svelte' });
themeRegistry.register({ manifest: cuteManifest, component: CuteShell, source: 'builtin', kind: 'svelte' });
