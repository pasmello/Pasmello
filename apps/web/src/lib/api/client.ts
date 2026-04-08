const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

import type { Workspace, ToolManifest, ThemeSettings } from '@pasmello/shared';

export const api = {
    workspaces: {
        list: () => request<{ workspaces: string[] }>('/workspaces'),
        get: (name: string) => request<Workspace>(`/workspaces/${name}`),
        create: (name: string) => request<Workspace>('/workspaces', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),
        update: (name: string, data: Workspace) => request<Workspace>(`/workspaces/${name}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (name: string) => request<void>(`/workspaces/${name}`, {
            method: 'DELETE',
        }),
    },
    tools: {
        list: () => request<{ tools: ToolManifest[] }>('/tools'),
        get: (id: string) => request<ToolManifest>(`/tools/${id}`),
        install: (path: string) => request<{ status: string }>('/tools/install', {
            method: 'POST',
            body: JSON.stringify({ path }),
        }),
        remove: (id: string) => request<void>(`/tools/${id}`, {
            method: 'DELETE',
        }),
    },
    settings: {
        get: () => request<{ port: number; dataDir: string; devMode: boolean }>('/settings'),
        getTheme: () => request<ThemeSettings>('/settings/theme'),
        updateTheme: (data: ThemeSettings) => request<ThemeSettings>('/settings/theme', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },
};
