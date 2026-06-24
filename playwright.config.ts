/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig } from '@playwright/test';
import { generateProjects } from '@backstage/e2e-test-utils/playwright';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: process.env.CI ? 60_000 : 30_000,
  globalSetup: require.resolve('./playwright.global-setup.ts'),

  expect: {
    timeout: process.env.CI ? 15_000 : 10_000,
  },

  // Run your local dev server before starting the tests
  webServer: process.env.CI
    ? []
    : [
        {
          command: 'yarn dev',
          port: 7008,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 2,

  reporter: [['html', { open: 'never', outputFolder: 'e2e-test-report' }]],

  use: {
    actionTimeout: 0,
    // Use the live frontend dev server locally. The backend on 7008 serves
    // packages/app/dist, which can drift from current FE source during E2E.
    baseURL: process.env.PLAYWRIGHT_URL ?? 'http://localhost:3001',
    channel: process.env.CI ? 'chrome' : undefined,
    storageState: 'node_modules/.cache/e2e-auth/guest.json',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  outputDir: 'node_modules/.cache/e2e-test-results',

  projects: generateProjects(), // Find all packages with e2e-test folders
});
