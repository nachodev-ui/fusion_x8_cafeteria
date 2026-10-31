import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4378', headless: true, channel: 'msedge', screenshot: 'off', video: 'off', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4378', url: 'http://127.0.0.1:4378/admin/', reuseExistingServer: false,
    env: { CMS_BRIDGE_BASE_URL: 'https://auth.example.test', CMS_BRIDGE_CLIENT_ID: 'test-client', CMS_BRIDGE_GATEWAY_URL: 'https://gateway.example.test/github', CMS_BRIDGE_AUTH_ENDPOINT: 'authorize', CMS_BRIDGE_TOKEN_ENDPOINT: 'token', CMS_BRIDGE_STATUS_ENDPOINT: 'https://gateway.example.test/status' },
  },
});
