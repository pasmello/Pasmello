// Clock tool — demonstrates basic Pasmello SDK usage
// import { initSDK } from '@pasmello/sdk';

// For now, run standalone without SDK (SDK connection is optional)
const timeEl = document.getElementById('time')!;
const dateEl = document.getElementById('date')!;
const timezoneEl = document.getElementById('timezone')!;

function update() {
    const now = new Date();

    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    timeEl.innerHTML = `${hours}:${minutes}<span class="seconds">${seconds}</span>`;

    dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    timezoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
}

update();
setInterval(update, 1000);

// SDK integration (when available)
// initSDK().then((sdk) => {
//     sdk.ui.getTheme().then((vars) => {
//         console.log('Theme loaded:', Object.keys(vars).length, 'variables');
//     });
// });
