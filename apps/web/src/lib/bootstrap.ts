import { storage } from '$lib/storage';
import { installBuiltinsIfMissing } from '$lib/tools/install';

const BUILTIN_TOOL_IDS = ['clock'];

/**
 * First-run bootstrap: ensures storage is initialized, builtins are installed,
 * and the default workspace surfaces at least one tool so the user sees
 * something on initial load.
 */
export async function bootstrapApp(): Promise<void> {
    await storage.init();
    const newlyInstalled = await installBuiltinsIfMissing(BUILTIN_TOOL_IDS);
    if (newlyInstalled.length > 0) {
        await seedDefaultWorkspaceWithBuiltins(newlyInstalled);
    }
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
