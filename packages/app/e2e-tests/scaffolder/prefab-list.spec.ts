import { test, expect } from '@playwright/test';
import { PrefabListPage } from '../pages/PrefabListPage';

test.describe('Prefab List Page', () => {
  let prefabListPage: PrefabListPage;
  const createdPrefabTitles: string[] = [];

  test.beforeEach(async ({ page }) => {
    prefabListPage = new PrefabListPage(page);
    await prefabListPage.goto();
  });

  test.afterEach(async () => {
    await prefabListPage.goto();
    for (const title of createdPrefabTitles) {
      try {
        await prefabListPage.deletePrefabViaUi(title);
      } catch {
        // Ignore if already deleted
      }
    }
    createdPrefabTitles.length = 0;
  });

  test('should display prefabs', async () => {
    const title = `test-prefab-${Date.now()}`;
    await prefabListPage.createPrefabViaApi(title);
    createdPrefabTitles.push(title);

    await prefabListPage.goto();
    await expect(prefabListPage.getPrefabCard(title)).toBeVisible();
  });

  test('should filter prefabs by search', async () => {
    const title1 = `unique-prefab-1-${Date.now()}`;
    const title2 = `unique-prefab-2-${Date.now()}`;

    await prefabListPage.createPrefabViaApi(title1);
    createdPrefabTitles.push(title1);
    await prefabListPage.createPrefabViaApi(title2);
    createdPrefabTitles.push(title2);

    await prefabListPage.goto();
    await prefabListPage.search(title1);

    await expect(prefabListPage.getPrefabCard(title1)).toBeVisible();
    await expect(prefabListPage.getPrefabCard(title2)).not.toBeVisible();
  });

  test('should delete a prefab', async () => {
    const title = `delete-me-${Date.now()}`;
    await prefabListPage.createPrefabViaApi(title);
    createdPrefabTitles.push(title);

    await prefabListPage.goto();
    await prefabListPage.deletePrefab(title);

    await expect(prefabListPage.getPrefabCard(title)).not.toBeVisible();
    // Remove from cleanup list to avoid 404
    const index = createdPrefabTitles.indexOf(title);
    if (index > -1) createdPrefabTitles.splice(index, 1);
  });

  test('should bulk delete prefabs', async () => {
    const title1 = `bulk-delete-1-${Date.now()}`;
    const title2 = `bulk-delete-2-${Date.now()}`;

    await prefabListPage.createPrefabViaApi(title1);
    createdPrefabTitles.push(title1);
    await prefabListPage.createPrefabViaApi(title2);
    createdPrefabTitles.push(title2);

    await prefabListPage.goto();
    await prefabListPage.bulkDelete([title1, title2]);

    await expect(prefabListPage.getPrefabCard(title1)).not.toBeVisible();
    await expect(prefabListPage.getPrefabCard(title2)).not.toBeVisible();

    // Cleanup list update
    const idx1 = createdPrefabTitles.indexOf(title1);
    if (idx1 > -1) createdPrefabTitles.splice(idx1, 1);
    const idx2 = createdPrefabTitles.indexOf(title2);
    if (idx2 > -1) createdPrefabTitles.splice(idx2, 1);
  });

  test('should display empty state when no prefabs exist', async ({ page }) => {
    await prefabListPage.goto();
    // Ensure no prefabs are present (this might be flaky if other tests run in parallel, 
    // but assuming sequential execution or isolated environment)
    // Actually, we can just search for something that doesn't exist
    await prefabListPage.search('non-existent-prefab-xyz');
    await expect(page.getByText('No prefabs match your search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prefabs you create or install will show up here.' })).not.toBeVisible(); // Description check
  });
});
