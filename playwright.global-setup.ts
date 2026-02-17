import { chromium, FullConfig } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_STATE_PATH = 'node_modules/.cache/e2e-auth/guest.json';

export default async function globalSetup(config: FullConfig) {
  const configuredBaseUrl = process.env.PLAYWRIGHT_URL;
  const projectBaseUrl = config.projects.find(p => p.use?.baseURL)?.use
    ?.baseURL as string | undefined;
  const baseURL =
    configuredBaseUrl ?? projectBaseUrl ?? 'http://localhost:3000';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    const enterButton = page.getByRole('button', { name: 'Enter' });
    const hasEnterButton = await enterButton
      .isVisible({ timeout: 30000 })
      .catch(() => false);

    if (hasEnterButton) {
      await enterButton.click({ force: true });
      // `networkidle` is flaky with long-lived dev requests (HMR, polling).
      // `domcontentloaded` is enough for persisting auth storage state.
      await page.waitForLoadState('domcontentloaded');
    }

    await mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_STATE_PATH });
  } finally {
    await context.close();
    await browser.close();
  }
}
