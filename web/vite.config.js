import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// One JS file and one CSS file, fonts inlined. scripts/embed-web.mjs turns them into src/app.generated.js, which the Worker serves at /_app/.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {output: {entryFileNames: 'app.js', assetFileNames: 'app[extname]', codeSplitting: false}},
  },
});
