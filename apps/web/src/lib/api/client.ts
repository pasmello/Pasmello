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

export const api = {
    workspaces: {
        list: () => request<{ workspaces: string[] }>('/workspaces'),
        get: (name: string) => request<any>(`/workspaces/${name}`),
        create: (name: string) => request<any>('/workspaces', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),
        delete: (name: string) => request<void>(`/workspaces/${name}`, {
            method: 'DELETE',
        }),
    },
    tools: {
        list: () => request<{ tools: any[] }>('/tools'),
        get: (id: string) => request<any>(`/tools/${id}`),
    },
    settings: {
        get: () => request<any>('/settings'),
    },
};
