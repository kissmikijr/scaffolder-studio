import { test, expect } from '@playwright/test';
import { PrefabListPage } from '../pages/PrefabListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Prefab Lifecycle', () => {
    let prefabListPage: PrefabListPage;
    let editorPage: ScaffolderStudioPage;
    const createdPrefabTitles: string[] = [];

    test.beforeEach(async ({ page }) => {
        prefabListPage = new PrefabListPage(page);
        editorPage = new ScaffolderStudioPage(page);
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
    });

    test('should create, configure, publish, and verify a prefab', async ({ page }) => {
        const title = `lifecycle-prefab-${Date.now()}`;
        createdPrefabTitles.push(title);

        // 1. Create Prefab
        await prefabListPage.createPrefabViaUi(title);

        // 2. Verify redirect to editor and load
        await expect(page).toHaveURL(/\/scaffolder-studio\/prefab\/[^/]+$/);
        await editorPage.verifyLoaded();

        // 3. Configure the Step
        // The default node is a generic 'step', we need to select an action.
        await editorPage.selectNode('Step');
        await editorPage.selectAction('debug:log');

        await editorPage.configureStep('log-step', 'Log Message', {
            message: 'Hello World from E2E',
        });

        // 4. Save (Auto-save is on, but let's wait a bit or force save if we could)
        // We'll rely on the auto-save PUT request from the next navigation or wait a bit.
        // Let's use the keyboard shortcut to be sure and wait for request.
        const savePromise = page.waitForResponse(
            resp => resp.url().includes('/prefabs/') && resp.request().method() === 'PUT' && resp.ok()
        );
        await editorPage.saveWithShortcut();
        await savePromise;

        // 5. Navigate back to list
        await prefabListPage.goto();

        // 6. Verify it looks unpublished initially (no version pill or 'Not Published' pill check?)
        // The card should exist.
        await expect(prefabListPage.getPrefabCard(title)).toBeVisible();

        // 7. Publish to Library
        await prefabListPage.publishPrefab(title);

        // 8. Verify Published State
        // Reload page to ensure we see the new state from server (though optimistic UI might update it)
        await prefabListPage.goto();

        const card = prefabListPage.getPrefabCard(title);
        await expect(card).toBeVisible();
        await expect(card).toContainText('v1'); // Check for version pill

        // Optionally check that the "Not Published" chip is gone or "Published" icon is there
        // But verifying version 'v1' is a strong enough signal.
    });
});
