import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type PluginOption} from 'vite';

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (command === 'serve') {
    process.env.AI_HUB_PREVIEW = 'true';
    const { createApiApp } = await import('./server/app.js');
    const apiApp = createApiApp();
    plugins.push({
      name: 'ontap-local-api',
      configureServer(server) {
        server.middlewares.use('/api', apiApp as any);
      }
    });
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['terminal.local'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
