import { initThemeSDK, type CurrentView } from '@pasmello/theme-sdk';

const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-item'));
const workspaceEl = document.getElementById('workspace-name')!;
const toggleEl = document.getElementById('theme-toggle') as HTMLButtonElement;

function render(currentView: CurrentView, colorScheme: 'light' | 'dark', workspaceName: string) {
    workspaceEl.textContent = workspaceName || '—';
    toggleEl.textContent = colorScheme === 'dark' ? '☀️' : '🌙';
    for (const btn of navButtons) {
        btn.classList.toggle('active', btn.dataset.view === currentView);
    }
}

initThemeSDK().then((sdk) => {
    const chrome = sdk.chrome;
    if (!chrome) return;

    render(chrome.currentView, chrome.colorScheme, chrome.workspaceName);

    chrome.onViewChange((v) => render(v, chrome.colorScheme, chrome.workspaceName));
    chrome.onWorkspaceNameChange((n) => render(chrome.currentView, chrome.colorScheme, n));
    chrome.onColorSchemeChange((s) => render(chrome.currentView, s, chrome.workspaceName));

    for (const btn of navButtons) {
        btn.addEventListener('click', () => {
            const to = btn.dataset.view as CurrentView | undefined;
            if (to) chrome.navigate(to);
        });
    }
    toggleEl.addEventListener('click', () => chrome.setColorScheme('toggle'));
}).catch((err) => {
    console.warn('[advanced theme] SDK init failed', err);
});
