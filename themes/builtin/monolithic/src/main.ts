import { initThemeSDK, type CurrentView } from '@pasmello/theme-sdk';

const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-item'));
const workspaceEl = document.getElementById('workspace-name')!;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const collapseToggle = document.getElementById('collapse-toggle') as HTMLButtonElement;

const EXPANDED = 240;
const COLLAPSED = 56;
let collapsed = false;

function renderNav(active: CurrentView) {
    for (const btn of navButtons) {
        btn.classList.toggle('active', btn.dataset.view === active);
    }
}

function renderTheme(scheme: 'light' | 'dark') {
    themeToggle.textContent = scheme === 'dark' ? '☀️' : '🌙';
}

function renderCollapsed() {
    document.body.classList.toggle('collapsed', collapsed);
    collapseToggle.textContent = collapsed ? '▶' : '◀';
}

initThemeSDK().then((sdk) => {
    const chrome = sdk.chrome;
    if (!chrome) return;

    workspaceEl.textContent = chrome.workspaceName || '—';
    renderNav(chrome.currentView);
    renderTheme(chrome.colorScheme);
    renderCollapsed();

    chrome.onViewChange(renderNav);
    chrome.onWorkspaceNameChange((n) => { workspaceEl.textContent = n || '—'; });
    chrome.onColorSchemeChange(renderTheme);

    for (const btn of navButtons) {
        btn.addEventListener('click', () => {
            const to = btn.dataset.view as CurrentView | undefined;
            if (to) chrome.navigate(to);
        });
    }
    themeToggle.addEventListener('click', () => chrome.setColorScheme('toggle'));
    collapseToggle.addEventListener('click', () => {
        collapsed = !collapsed;
        renderCollapsed();
        chrome.resize(collapsed ? COLLAPSED : EXPANDED);
    });
}).catch((err) => {
    console.warn('[monolithic theme] SDK init failed', err);
});
