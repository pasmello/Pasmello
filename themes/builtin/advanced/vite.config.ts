import { defineConfig } from 'vite';
import { inlineAssets } from '../../../tools/shared/vite-inline-assets';

export default defineConfig({
    base: './',
    plugins: [inlineAssets()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: 'chrome.html',
        },
    },
});
