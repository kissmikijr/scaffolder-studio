import { test, expect, Page } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

const DRY_RUN_RESULTS_TIMEOUT_MS = 30_000;

const completeDryRunStepper = async ({ page }: { page: Page }) => {
  const nextButton = page.getByRole('button', { name: 'Next' });
  while (await nextButton.isVisible()) {
    await nextButton.click();
  }

  const reviewButton = page.getByRole('button', { name: 'Review' });
  if (await reviewButton.isVisible()) {
    await reviewButton.click();
  }

  const createButton = page.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeVisible();
  await createButton.click();
};

const waitForDryRunResults = async ({ page }: { page: Page }) => {
  await expect(
    page.getByRole('heading', { name: 'Execution Steps' }),
  ).toBeVisible({
    timeout: DRY_RUN_RESULTS_TIMEOUT_MS,
  });
  await expect(
    page.getByRole('heading', { name: 'Template Outputs' }),
  ).toBeVisible({
    timeout: DRY_RUN_RESULTS_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible({
    timeout: DRY_RUN_RESULTS_TIMEOUT_MS,
  });
};

const ensureDryRunInputStep = async ({
  page,
  fieldLabel,
}: {
  page: Page;
  fieldLabel: string;
}) => {
  const input = page.getByRole('textbox', { name: fieldLabel });
  if (await input.isVisible()) {
    return;
  }

  const backButton = page.getByRole('button', { name: /back/i });
  for (let i = 0; i < 3; i++) {
    if (await input.isVisible()) {
      return;
    }
    if (!(await backButton.isVisible())) {
      break;
    }
    await backButton.click();
  }

  await expect(input).toBeVisible();
};

test.describe('Dry Run Feature', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage.cleanupCreatedTemplates();
  });

  test('should execute dry run for a simple template', async ({ page }) => {
    const id = Math.floor(Math.random() * 100000);
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    await editorPage.editTemplateNode(
      `dry-run-template-${id}`,
      'group:roadiehq/engineering',
      'Dry run template',
    );

    await editorPage.selectNode('Template');

    await editorPage.addParametersNode();
    await editorPage.configureParametersNode({ title: 'Dry Run Params' });

    await editorPage.collapseSideContent();

    await editorPage.addProperty({ parentNodeText: 'Dry Run Params' });

    await editorPage.configureProperty(
      'testParam',
      'string',
      'Test Parameter',
      'A parameter for dry run',
    );

    await editorPage.addStepAndSelectAction('debug:log', 'Template');
    await editorPage.configureStep('log-message', 'Log Message', {
      message: 'Hello Dry Run',
    });
    await page
      .locator('form')
      .getByRole('paragraph')
      .filter({ hasText: /^$/ })
      .fill('${{}}');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.getByRole('button', { name: 'testParam', exact: true }).click();

    await page.waitForTimeout(500);

    await editorPage.clickDryRun();

    await expect(page).toHaveURL(/\/scaffolder-studio\/templates\/.*\/dry-run/);
    await expect(
      page.getByRole('heading', { name: 'Template Parameters' }),
    ).toBeVisible();

    await page.getByLabel('Test Parameter').fill('Hello Dry Run');

    await completeDryRunStepper({ page });

    await waitForDryRunResults({ page });
    await expect(
      page.getByText('"message": "Hello Dry Run"').first(),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test('should persist dry run form data after closing and reopening', async ({
    page,
  }) => {
    const id = Math.floor(Math.random() * 100000);
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    await editorPage.editTemplateNode(
      `dry-run-persist-${id}`,
      'group:roadiehq/engineering',
      'Dry run persistence',
    );

    await editorPage.selectNode('Template');

    await editorPage.addParametersNode();
    await editorPage.configureParametersNode({ title: 'Dry Run Params' });

    await editorPage.collapseSideContent();

    await editorPage.addProperty({ parentNodeText: 'Dry Run Params' });

    await editorPage.configureProperty(
      'city',
      'string',
      'City',
      'Enter a city name',
    );

    // Add a step to make the template valid for dry run
    await editorPage.addStepAndSelectAction('debug:log', 'Template');
    await editorPage.configureStep('log-message', 'Log Message', {
      message: 'Hello from dry run',
    });

    // Go to Dry Run
    await editorPage.clickDryRun();
    await expect(page).toHaveURL(/\/scaffolder-studio\/templates\/.*\/dry-run/);
    const dryRunUrlMatch = page.url().match(/\/templates\/([^/]+)\/dry-run/);
    expect(dryRunUrlMatch?.[1]).toBeTruthy();
    const templateId = dryRunUrlMatch![1];

    await page.getByLabel('City').fill('Budapest');

    await completeDryRunStepper({ page });

    await waitForDryRunResults({ page });

    await page.waitForTimeout(1000);
    // Close Dry Run
    await page.getByRole('button', { name: 'Close dry run' }).click();

    // Wait for transition off dry-run first.
    await expect(page).not.toHaveURL(/\/dry-run$/);
    // If close fallback landed outside editor form, normalize route before reopening.
    if (!/\/scaffolder-studio\/templates\/[^/]+\/form$/.test(page.url())) {
      await page.goto(`/scaffolder-studio/templates/${templateId}/form`);
    }
    await expect(page).toHaveURL(
      new RegExp(`/scaffolder-studio/templates/${templateId}/form$`),
    );
    await editorPage.verifyLoaded();

    // Open Dry Run again
    await editorPage.clickDryRun();
    await expect(page).toHaveURL(/\/scaffolder-studio\/templates\/.*\/dry-run/);
    await expect(
      page.getByRole('heading', { name: 'Template Parameters' }),
    ).toBeVisible();
    await ensureDryRunInputStep({ page, fieldLabel: 'City' });

    await expect(page.getByRole('textbox', { name: 'City' })).toHaveValue(
      'Budapest',
    );
  });
});
