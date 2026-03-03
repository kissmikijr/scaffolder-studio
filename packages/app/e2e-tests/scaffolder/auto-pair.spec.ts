import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('AutoPairPlugin', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('should correctly auto-pair brackets and braces in parameter fields', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.expandSideContent();

    // Focus into the contenteditable field for the 'message' parameter
    // RJSF typically renders the field with a label containing the property name
    const fieldContainer = page
      .locator('.field-string')
      .filter({ hasText: 'message' })
      .first();

    const lexicalEditor = fieldContainer.locator('[contenteditable="true"]');

    // Wait for the field to appear and click it to focus
    await expect(lexicalEditor).toBeVisible();
    await lexicalEditor.click();

    // Delete any existing text if present (e.g. from InitialEditorStatePlugin)
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Control+A'); // Fallback for Linux/Windows
    await page.keyboard.press('Backspace');

    // Type a single array bracket [
    await page.keyboard.press('[');
    await expect(lexicalEditor).toHaveText('[]');

    // Clear it correctly by selecting all and deleting
    await lexicalEditor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    await expect(lexicalEditor).toHaveText('');

    // Type a single brace {
    await page.keyboard.press('{');
    await expect(lexicalEditor).toHaveText('{}');

    // Type a nested brace
    await page.keyboard.press('{');
    await expect(lexicalEditor).toHaveText('{{}}');

    // Clear it correctly
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    await expect(lexicalEditor).toHaveText('');

    // Type a parenthesis (
    await page.keyboard.press('(');
    await expect(lexicalEditor).toHaveText('()');

    // Type another nested brace
    await page.keyboard.press('{');
    // It should be ({}) now
    await expect(lexicalEditor).toHaveText('({})');

    // Type some text inside
    await page.keyboard.type('parameters.test');
    await expect(lexicalEditor).toHaveText('({parameters.test})');

    // Ensure it doesn't loop infinitely or crash by typing another single brace
    // Type another single brace at the end to ensure no infinite loops
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('{');
    // We don't strictly check the text here as cursor pos can be flaky in E2E,
    // but the fact we got here means it didn't crash or loop.
    await expect(lexicalEditor).toContainText('{}');
  });
});
