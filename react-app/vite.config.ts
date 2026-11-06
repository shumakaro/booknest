import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Корневой .env общий для сервера и dev-proxy; VITE_ не содержит секретов.
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, root, '');
  const target = env.VITE_API_TARGET;
  return {
    plugins: [react()], envDir: root,
    server: {
      port: Number(env.VITE_PORT || 5173),
      proxy: target ? { '/api': { target, changeOrigin: true } } : undefined,
    },
  };
});
