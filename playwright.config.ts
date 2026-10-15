import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173/sandkeep/',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] },
  },
  webServer: {
    command: 'npm run preview -- --base=/sandkeep/ --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/sandkeep/',
    reuseExistingServer: true,
  },
});
