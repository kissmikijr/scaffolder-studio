import { Page, Locator } from '@playwright/test';

export class PrefabListPage {
  constructor(private readonly page: Page) { }

  async goto() {
    await this.page.goto('/scaffolder-studio/prefabs');
    const enterButton = this.page.getByRole('button', { name: 'Enter' });
    if (await enterButton.isVisible()) {
      await enterButton.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  getPrefabCards(): Locator {
    return this.page.locator('[data-testid="prefab-card"]');
  }

  getPrefabCard(title: string): Locator {
    return this.getPrefabCards().filter({ hasText: title });
  }

  async getPrefabCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    return this.getPrefabCards().count();
  }

  async createPrefabViaUi(title: string): Promise<string> {
    await this.goto();
    await this.page.getByRole('button', { name: 'New' }).click();
    await this.page.waitForURL(/\/scaffolder-studio\/prefab\/[^/]+$/);

    const url = this.page.url();
    const prefabId = url.split('/prefab/')[1];
    if (!prefabId) {
      throw new Error('Failed to extract prefab id from URL');
    }

    // Wait for editor to be ready and initial data loaded (title 'New Prefab') to avoid race condition
    await this.page.waitForFunction(
      () => {
        const input = document.querySelector(
          'input[placeholder="Prefab Title"]',
        ) as HTMLInputElement;
        return input?.value === 'New Prefab';
      },
      null,
      { timeout: 15000 },
    );

    const titleInput = this.page.getByPlaceholder('Prefab Title');
    await titleInput.fill(title);

    return prefabId;
  }

  async deletePrefabViaUi(title: string) {
    const card = this.getPrefabCard(title);
    if ((await card.count()) === 0) {
      return;
    }
    await card.first().click();
    await card.first().click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: 'Delete Prefab' }).click();
    await this.page
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
  }

  async publishPrefab(title: string) {
    const card = this.getPrefabCard(title);
    await card.first().click();
    await card.first().click({ button: 'right' });
    await this.page
      .getByRole('menuitem', { name: 'Publish to Library' })
      .click();

    await this.page.waitForFunction(() => {
      const alerts = document.querySelectorAll('[class*="MuiAlert-message"]');
      return Array.from(alerts).some(alert =>
        alert.textContent?.includes('Prefab published to library successfully'),
      );
    });
  }

  async search(query: string) {
    const searchInput = this.page.getByPlaceholder('Search');
    await searchInput.fill(query);
  }

  async deletePrefab(title: string) {
    const card = this.getPrefabCard(title);
    await card.first().click();
    await card.click({ button: 'right' });

    await this.page.getByRole('menuitem', { name: 'Delete Prefab' }).click();

    await this.page
      .getByRole('button', { name: 'Delete', exact: true })
      .click();

    await this.page.waitForResponse(
      resp =>
        resp.url().includes('/prefabs/') &&
        resp.request().method() === 'DELETE',
    );
  }

  async bulkDelete(titles: string[]) {
    if (titles.length === 0) return;

    await this.getPrefabCard(titles[0]).click();

    for (let i = 1; i < titles.length; i++) {
      await this.getPrefabCard(titles[i]).click({ modifiers: ['Shift'] });
    }

    this.page.once('dialog', dialog => dialog.accept());

    await this.getPrefabCard(titles[0]).click({ button: 'right' });

    const deleteMenuItem = this.page.getByRole('menuitem', {
      name: `Delete ${titles.length} Prefabs`,
    });

    const deletePromise = this.page.waitForResponse(
      resp =>
        resp.url().includes('/prefabs/') &&
        resp.request().method() === 'DELETE' &&
        resp.status() === 200,
    );
    await deleteMenuItem.click();
    await deletePromise;
  }

  private authToken?: string;

  private getBackendBaseCandidates(): string[] {
    const configuredBase = process.env.PLAYWRIGHT_URL?.replace(/\/$/, '');
    const candidates = [configuredBase, 'http://localhost:7007'].filter(
      Boolean,
    ) as string[];
    return [...new Set(candidates)];
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    for (const base of this.getBackendBaseCandidates()) {
      const res = await this.page.request.get(`${base}/api/auth/guest/refresh`);
      if (!res.ok()) {
        continue;
      }
      try {
        const body = await res.json();
        const token = body?.backstageIdentity?.token as string | undefined;
        if (token) {
          this.authToken = token;
          return token;
        }
      } catch {
        // Not JSON/token response, continue.
      }
    }

    throw new Error('Failed to get backend auth token');
  }

  async createPrefabViaApi(title: string, data: any = {}): Promise<string> {
    const token = await this.getAuthToken();
    const baseCandidates = this.getBackendBaseCandidates();
    let response;

    for (const base of baseCandidates) {
      response = await this.page.request.post(
        `${base}/api/scaffolder-studio/prefabs`,
        {
          data: {
            title,
            owner: 'test-owner',
            node: {
              id: 'root-node',
              type: 'step',
              data: {
                name: 'test-step',
              },
              position: { x: 0, y: 0 },
              ...data.node,
            },
            ...data,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status() !== 404) {
        break;
      }
    }

    if (!response) {
      throw new Error('Failed to create prefab via API: No response');
    }

    if (!response.ok()) {
      throw new Error(
        `Failed to create prefab via API: ${response.statusText()}`,
      );
    }

    const json = await response.json();
    return json.id;
  }

  getSectionHeader(title: string): Locator {
    return this.page.getByRole('heading', { name: title });
  }
}
