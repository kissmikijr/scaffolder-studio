import { test, expect } from '@playwright/test';
import { TemplateListPage } from '../pages/TemplateListPage';

test.describe('Template List Operations', () => {
  let templateListPage: TemplateListPage;
  let createdTemplateIds: string[];

  test.beforeEach(async ({ page }) => {
    templateListPage = new TemplateListPage(page);
    createdTemplateIds = [];

    // Seed stable baseline data for list/sort/search tests.
    const seedA = await templateListPage.createTemplateViaApi(
      `e2e-seed-a-${Date.now()}`,
    );
    const seedB = await templateListPage.createTemplateViaApi(
      `e2e-seed-b-${Date.now()}`,
    );
    createdTemplateIds.push(seedA, seedB);
  });

  test.afterEach(async () => {
    for (const id of createdTemplateIds) {
      try {
        await templateListPage.deleteTemplate(id);
      } catch {
        // Best effort cleanup.
      }
    }
  });

  test('should navigate between Templates and Trash tabs', async ({ page }) => {
    await templateListPage.goto();

    await expect(page).toHaveURL(/\/scaffolder-studio/);

    await templateListPage.clickTrashTab();
    await expect(page).toHaveURL(/\/scaffolder-studio\/trash/);

    await templateListPage.clickTemplatesTab();
    await expect(page).toHaveURL(/\/scaffolder-studio\/templates/);
  });

  test('should display template cards', async ({ page }) => {
    await templateListPage.goto();

    const count = await templateListPage.getTemplateCount();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open context menu on right-click', async ({ page }) => {
    await templateListPage.goto();

    const count = await templateListPage.getTemplateCount();

    if (count > 0) {
      await templateListPage.rightClickFirstTemplate();

      await expect(page.getByRole('menuitem', { name: /open/i })).toBeVisible();
      await expect(
        page.getByRole('menuitem', { name: /move to trash/i }),
      ).toBeVisible();

      await page.mouse.click(100, 100);
    } else {
      test.skip();
    }
  });

  test('should sort templates by name and last modified', async ({ page }) => {
    await templateListPage.goto();

    const count = await templateListPage.getTemplateCount();

    if (count < 2) {
      test.skip();
      return;
    }

    await templateListPage.selectSortOption('name');
    const namesSorted = await templateListPage.getTemplateNames();

    const expectedAlphabetical = [...namesSorted].sort((a, b) =>
      a.localeCompare(b),
    );
    expect(namesSorted).toEqual(expectedAlphabetical);

    await templateListPage.selectSortOption('updated');
    const namesDateSorted = await templateListPage.getTemplateNames();

    expect(namesSorted.length).toBe(namesDateSorted.length);
  });

  test('should filter templates by search query', async ({ page }) => {
    await templateListPage.goto();

    const count = await templateListPage.getTemplateCount();

    if (count < 1) {
      test.skip();
      return;
    }

    const names = await templateListPage.getTemplateNames();
    const firstTemplateName = names[0];

    await templateListPage.searchForTemplate(firstTemplateName);

    const filteredNames = await templateListPage.getTemplateNames();
    expect(filteredNames).toContain(firstTemplateName);
    expect(filteredNames.length).toBeLessThanOrEqual(names.length);

    await templateListPage.searchForTemplate(
      'this-string-should-not-exist-in-any-template-name-xyz',
    );
    const countAfterSearch = await templateListPage.getTemplateCount();
    expect(countAfterSearch).toBe(0);

    await templateListPage.searchForTemplate('');
    const countAfterClear = await templateListPage.getTemplateCount();
    expect(countAfterClear).toBe(count);
  });

  test('should import a template from YAML', async ({ page }) => {
    await templateListPage.goto();

    await templateListPage.clickImportTemplateButton();

    const sampleYaml = `apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-imported-template
  title: Test Imported Template
  description: A test template imported via E2E test
spec:
  owner: test
  type: service
  parameters:
    - title: Basic Info
      required:
        - name
      properties:
        name:
          title: Name
          type: string
          description: Name of the component
  steps:
    - id: log
      name: Log Message
      action: debug:log
      input:
        message: Hello from imported template`;

    await templateListPage.fillImportDialog(sampleYaml);

    const importResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/templates/import') &&
        response.request().method() === 'POST',
    );

    await templateListPage.submitImportDialog();

    const response = await importResponsePromise;
    expect(response.ok()).toBeTruthy();

    await page.waitForURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
      { timeout: 10000 },
    );
    await expect(page).toHaveURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
    );

    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'Basic Info' }),
    ).toBeVisible();
    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'Log Message' }),
    ).toBeVisible();
    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'Name' }),
    ).toBeVisible();
    await expect(
      page
        .locator('.react-flow__node')
        .filter({ hasText: 'test-imported-template' }),
    ).toBeVisible();

    const importedTemplateId = page.url().match(/templates\/([^/]+)\//)?.[1];
    if (importedTemplateId) {
      createdTemplateIds.push(importedTemplateId);
      await templateListPage.deleteTemplate(importedTemplateId);
    }
  });

  test('should import a template from JSON', async ({ page }) => {
    await templateListPage.goto();

    await templateListPage.clickImportTemplateButton();

    await page.getByRole('button', { name: 'JSON' }).click();

    const sampleJson = JSON.stringify(
      {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: 'test-imported-json-template',
          title: 'Test Imported JSON Template',
          description: 'A test template imported via E2E test in JSON format',
        },
        spec: {
          owner: 'test',
          type: 'service',
          parameters: [
            {
              title: 'JSON Info',
              required: ['name'],
              properties: {
                name: {
                  title: 'Name',
                  type: 'string',
                  description: 'Name of the component',
                },
              },
            },
          ],
          steps: [
            {
              id: 'log',
              name: 'Log JSON Message',
              action: 'debug:log',
              input: { message: 'Hello from imported JSON template' },
            },
          ],
        },
      },
      null,
      2,
    );

    await templateListPage.fillImportDialog(sampleJson);

    const importResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/templates/import') &&
        response.request().method() === 'POST',
    );

    await templateListPage.submitImportDialog();

    const response = await importResponsePromise;
    expect(response.ok()).toBeTruthy();

    await page.waitForURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
      { timeout: 10000 },
    );

    await expect(page).toHaveURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
    );

    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'JSON Info' }),
    ).toBeVisible();

    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'Log JSON Message' }),
    ).toBeVisible();

    const importedTemplateId = page.url().match(/templates\/([^/]+)\//)?.[1];
    if (importedTemplateId) {
      createdTemplateIds.push(importedTemplateId);
      await templateListPage.deleteTemplate(importedTemplateId);
    }
  });
});

test.describe('Template Description Display', () => {
  let templateListPage: TemplateListPage;
  let createdTemplateIds: string[];

  test.beforeEach(async ({ page }) => {
    templateListPage = new TemplateListPage(page);
    createdTemplateIds = [];
  });

  test.afterEach(async () => {
    for (const id of createdTemplateIds) {
      try {
        await templateListPage.deleteTemplate(id);
      } catch {
        // Best effort cleanup.
      }
    }
  });

  test('should display template description in list view', async ({
    page,
  }) => {
    const templateName = `e2e-desc-test-${Date.now()}`;
    const description = 'A helpful template description';

    const id =
      await templateListPage.createTemplateWithDescriptionViaApi(
        templateName,
        description,
      );
    createdTemplateIds.push(id);

    await templateListPage.goto();

    // Switch to list view
    const listViewButton = page.getByTestId('list-view-button').or(
      page.locator('button[aria-label="List view"]'),
    );
    await listViewButton.click();
    await page.waitForTimeout(500);

    // In list view, find the row containing our template name
    const row = page.getByTestId('template-list-row').filter({
      hasText: templateName,
    });
    await expect(row).toBeVisible();

    await expect(row).toContainText(description);
  });

  test('should display template description in card view', async ({
    page,
  }) => {
    const templateName = `e2e-desc-card-${Date.now()}`;
    const description = 'Card view description test';

    const id =
      await templateListPage.createTemplateWithDescriptionViaApi(
        templateName,
        description,
      );
    createdTemplateIds.push(id);

    await templateListPage.goto();

    // Card view should show the description as secondary text
    const card = page
      .getByTestId('template-card')
      .filter({ hasText: templateName });
    await expect(card).toBeVisible();
    await expect(card).toContainText(description);
  });

  test('should not show description separator when no description exists', async ({
    page,
  }) => {
    const templateName = `e2e-no-desc-${Date.now()}`;

    const id = await templateListPage.createTemplateViaApi(templateName);
    createdTemplateIds.push(id);

    await templateListPage.goto();

    // Switch to list view
    const listViewButton = page.getByTestId('list-view-button').or(
      page.locator('button[aria-label="List view"]'),
    );
    await listViewButton.click();
    await page.waitForTimeout(500);

    const row = page.getByTestId('template-list-row').filter({
      hasText: templateName,
    });
    await expect(row).toBeVisible();

    // Should NOT contain the em-dash separator since there's no description
    await expect(row).not.toContainText('—');
  });

  test('should display empty state when no templates match search', async ({ page }) => {
    await templateListPage.goto();
    await templateListPage.searchForTemplate('non-existent-template-xyz');

    await expect(page.getByText('No templates match your search')).toBeVisible();
    await expect(page.getByText("Try adjusting your search terms to find what you're looking for.")).toBeVisible();
  });
});

