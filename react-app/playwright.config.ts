import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';

const env = loadEnv('development', fileURLToPath(new URL('..', import.meta.url)), '');
if (!env.PLAYWRIGHT_BASE_URL) throw new Error('Задайте PLAYWRIGHT_BASE_URL для запущенного приложения');
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 90000,
  use: { baseURL: env.PLAYWRIGHT_BASE_URL, channel: env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true, screenshot: 'only-on-failure', trace: 'off' },
  reporter: 'list',
});
