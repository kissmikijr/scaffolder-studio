import { Page, Locator } from '@playwright/test';

export async function ensureGuestLogin(
  page: Page,
  readyLocator: Locator,
  timeout = 10000,
) {
  const enterButton = page.getByRole('button', { name: 'Enter' });

  const loginOrReady = await Promise.race([
    enterButton.waitFor({ state: 'visible', timeout }).then(() => 'login'),
    readyLocator.waitFor({ state: 'visible', timeout }).then(() => 'ready'),
  ]).catch(() => 'timeout');

  if (loginOrReady === 'login') {
    await enterButton.click({ force: true });
    await readyLocator.waitFor({ state: 'visible', timeout }).catch(() => {});
  }
}
