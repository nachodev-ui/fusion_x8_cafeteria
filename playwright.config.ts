import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4378', headless: true, channel: 'msedge', screenshot: 'off', video: 'off', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4378', url: 'http://127.0.0.1:4378/admin/', reuseExistingServer: false,
  },
});
