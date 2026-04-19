import { storage } from '$lib/storage';
import { installBuiltinsIfMissing } from '$lib/tools/install';
import { defaultWorkspaceSettings } from '@pasmello/shared';

const BUILTIN_TOOL_IDS = ['clock'];

/**
 * First-run bootstrap: ensures storage is initialized, builtins are installed,
 * legacy global settings migrate onto the default workspace, and the default
 * workspace surfaces at least one tool so the user sees something on initial
 * load.
 */
export async function bootstrapApp(): Promise<void> {
    await storage.init();
    await migrateLegacyThemeSettings();
    const newlyInstalled = await installBuiltinsIfMissing(BUILTIN_TOOL_IDS);
    if (newlyInstalled.length > 0) {
        await seedDefaultWorkspaceWithBuiltins(newlyInstalled);
    }
}

async function migrateLegacyThemeSettings(): Promise<void> {
    const legacy = await storage.migrateGlobalThemeSettings();
    if (!legacy) return;
    const ws = await storage.getWorkspace('default');
    if (!ws) return;
    const settings = ws.settings ?? defaultWorkspaceSettings();
    ws.settings = {
        activeThemeId: legacy.activeTheme ?? settings.activeThemeId,
        colorScheme: legacy.colorScheme ?? settings.colorScheme,
        themes: legacy.perTheme ?? settings.themes,
        tools: settings.tools,
    };
    await storage.saveWorkspace(ws);
}

async function seedDefaultWorkspaceWithBuiltins(toolIds: string[]): Promise<void> {
    const ws = await storage.getWorkspace('default');
    if (!ws || ws.tools.length > 0) return;

    let y = 0;
    for (const toolId of toolIds) {
        const instanceId = `${toolId}-default`;
        ws.tools.push({ id: instanceId, toolName: toolId });
        ws.layout.items.push({ toolId, x: 0, y, w: 6, h: 4 });
        y += 4;
    }
    await storage.saveWorkspace(ws);
}
