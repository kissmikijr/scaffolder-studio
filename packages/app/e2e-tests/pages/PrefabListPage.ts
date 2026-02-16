import { Page, Locator } from '@playwright/test';

export class PrefabListPage {
  constructor(private readonly page: Page) {}

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
    await this.page.waitForTimeout(500);
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

    const titleInput = this.page.getByLabel('Title');
    await titleInput.fill(title);
    await this.page.waitForTimeout(1500);
    await this.goto();

    return prefabId;
  }

  async deletePrefabViaUi(title: string) {
    const card = this.getPrefabCard(title);
    if ((await card.count()) === 0) {
      return;
    }

    await card.first().click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: 'Delete Prefab' }).click();
    await this.page
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    const searchInput = this.page.getByPlaceholder('Search');
    await searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async deletePrefab(title: string) {
    const card = this.getPrefabCard(title);
    await card.click({ button: 'right' });

    await this.page.getByRole('menuitem', { name: 'Delete Prefab' }).click();

    // Confirm dialog
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

    // Select first card
    await this.getPrefabCard(titles[0]).click();

    // Select rest with Shift
    for (let i = 1; i < titles.length; i++) {
      await this.getPrefabCard(titles[i]).click({ modifiers: ['Shift'] });
    }

    // Setup dialog handler before triggering
    this.page.once('dialog', dialog => dialog.accept());

    // Right-click to open context menu
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
}
