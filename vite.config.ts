import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          'prototypes/image-to-voiceprint/index': path.resolve(
            __dirname,
            'prototypes/image-to-voiceprint/index.html',
          ),
          'prototypes/image-to-voiceprint/v1-gray-8/index': path.resolve(
            __dirname,
            'prototypes/image-to-voiceprint/v1-gray-8/index.html',
          ),
          'prototypes/image-to-voiceprint/v2-column-scan/index': path.resolve(
            __dirname,
            'prototypes/image-to-voiceprint/v2-column-scan/index.html',
          ),
          'prototypes/image-to-voiceprint/v3-global-hybrid/index': path.resolve(
            __dirname,
            'prototypes/image-to-voiceprint/v3-global-hybrid/index.html',
          ),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
