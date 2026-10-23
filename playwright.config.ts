import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', workers: 1, use: { baseURL: 'http://localhost:5173', browserName: 'chromium', channel: 'chrome', launchOptions: { args: ['--no-sandbox'] } }, reporter: 'list' });
