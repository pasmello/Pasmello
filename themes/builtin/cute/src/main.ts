import { initThemeSDK, type CurrentView } from '@pasmello/theme-sdk';

const bar = document.getElementById('bar')!;
const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.bar-item[data-view]'));
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;

let barVisible = true;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function setBarVisible(visible: boolean) {
    if (visible === barVisible) return;
    barVisible = visible;
    bar.classList.toggle('hidden', !visible);
}

window.addEventListener('mousemove', (e) => {
    if (e.clientY < 80) {
        setBarVisible(true);
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    } else if (!hideTimer) {
        hideTimer = setTimeout(() => {
            setBarVisible(false);
            hideTimer = null;
        }, 3000);
    }
});

function renderNav(active: CurrentView) {
    for (const btn of navButtons) {
        btn.classList.toggle('active', btn.dataset.view === active);
    }
}

function renderTheme(scheme: 'light' | 'dark') {
    themeToggle.textContent = scheme === 'dark' ? '☀️' : '🌙';
}

function applyCustomAccent(accent: string | undefined) {
    if (accent) document.documentElement.style.setProperty('--pm-accent', accent);
}
function applyCustomBg(bg: string | undefined) {
    if (bg) document.documentElement.style.setProperty('--pm-bg-primary', bg);
}

initThemeSDK().then(async (sdk) => {
    const chrome = sdk.chrome;
    if (!chrome) return;

    renderNav(chrome.currentView);
    renderTheme(chrome.colorScheme);

    chrome.onViewChange(renderNav);
    chrome.onColorSchemeChange(renderTheme);

    for (const btn of navButtons) {
        btn.addEventListener('click', () => {
            const to = btn.dataset.view as CurrentView | undefined;
            if (to) chrome.navigate(to);
        });
    }
    themeToggle.addEventListener('click', () => chrome.setColorScheme('toggle'));

    // Apply per-theme settings overrides
    const initial = (await sdk.settings.getAll()) as { accentColor?: string; backgroundColor?: string };
    applyCustomAccent(initial.accentColor);
    applyCustomBg(initial.backgroundColor);

    sdk.settings.onChange('accentColor', (v) => applyCustomAccent(v as string | undefined));
    sdk.settings.onChange('backgroundColor', (v) => applyCustomBg(v as string | undefined));
}).catch((err) => {
    console.warn('[cute theme] SDK init failed', err);
});
