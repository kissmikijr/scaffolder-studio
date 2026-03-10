import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Complex Template', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('should create a complex template with parameters, steps and outputs', async ({
    page,
  }) => {
    test.setTimeout(60000);

    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    await editorPage.editTemplateNode(
      'add-tenant-to-alerts',
      'group:roadiehq/engineering',
      'Adds the new customer to the PagerDuty alerts',
    );
    await page.getByLabel('Type').fill('service');

    await editorPage.addParametersNode();
    await editorPage.configureParametersNode({
      title: 'Provide some simple information',
    });
    await editorPage.collapseSideContent();

    await editorPage.selectNode('Provide some simple information');
    await editorPage.addProperty({
      parentNodeText: 'Provide some simple information',
    });

    await editorPage.configureProperty(
      'tenant_name',
      'string',
      'Name',
      'Must be tenant slug',
      true,
    );

    await editorPage.selectNode('Template');
    await editorPage.addStepAndSelectAction('fetch:plain', 'Template');
    await editorPage.configureStep('fetch-alerts-file', 'Fetch alerts file', {
      url: 'https://github.com/roadiehq/roadie-demo-infra/tree/main/terraform/tenant-alerting/',
      targetPath: 'fetch-folder',
    });

    await editorPage.panBy(-600, 0);

    await editorPage.addStepAndSelectAction('fs:rename', 'fetch-alerts-file');
    await editorPage.configureStep(
      'move-alerts-file-to-workbench',
      'Move alerts file to a standalone location',
      {},
    );

    await page.getByRole('button', { name: 'Add Item' }).click();
    const baseSelector =
      'form > div.form-group.field.field-object > div > div > div > div > div > div > div > div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2.MuiGrid-align-items-xs-center > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-true > div > div > div > div > div > div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2';

    await page
      .locator(
        `${baseSelector} > div:nth-child(1) > div > div > div:nth-child(1)`,
      )
      .click();
    await page.keyboard.type('fetch-folder/alertable_tenants.json');

    await page
      .locator(
        `${baseSelector} > div:nth-child(2) > div > div > div:nth-child(1)`,
      )
      .click();

    await editorPage.addStepAndSelectAction(
      'debug:log',
      'Move alerts file to a standalone location',
    );
    await editorPage.configureStep(
      'parse-alerts',
      'Parse retrieved alerts file',
      {
        message: 'Parsing alerts from ./alerts-folder/alertable_tenants.json',
      },
    );

    await editorPage.panBy(-600, 0);

    await editorPage.addStepAndSelectAction(
      'debug:log',
      'Parse retrieved alerts file',
    );
    await editorPage.configureStep(
      'log-alerts-content',
      'Parse Alerts Output',
      {
        message: 'Alerts content: ${{ steps["parse-alerts"].output.content }}',
      },
    );

    await editorPage.addStepAndSelectAction('debug:log', 'Parse Alerts Output');
    await editorPage.configureStep(
      'log-modified-alerts',
      'Display modified alerts file',
      {
        message:
          'alertable_tenants.json content: ${{ steps["parse-alerts"].output.content }}',
      },
    );

    await editorPage.panBy(-600, 0);

    await editorPage.addStepAndSelectAction(
      'debug:log',
      'Display modified alerts file',
    );
    await editorPage.configureStep(
      'log-customer-tag',
      'Display modified alerts file',
      {
        message: '${{ steps["add-customer-tag"].output.content }}',
      },
    );

    await editorPage.addStepAndSelectAction(
      'publish:github:pull-request',
      'Display modified alerts file',
    );

    await expect(page.getByLabel('id', { exact: true })).toBeVisible();
    await page.getByLabel('id', { exact: true }).fill('createPullRequest');
    await page
      .getByLabel('name', { exact: true })
      .fill('Create a pull request');

    await editorPage.panBy(1800, 0);

    await editorPage.selectNode('add-tenant-to-alerts');
    await editorPage.clickAddOutputToolbarButton();

    await editorPage.panBy(600, 0);

    await editorPage.selectNode('Add links or texts');

    await editorPage.configureOutput([
      {
        title: 'View the pull request on GitHub',
        url: "${{ steps['createPullRequest'].output.remoteUrl }}",
      },
    ]);

    await editorPage.goToYamlTab();
    const yaml = await editorPage.getYamlContent();

    expect(yaml).toContain('apiVersion: scaffolder.backstage.io/v1beta3');
    expect(yaml).toContain('kind: Template');
    expect(yaml).toContain('name: add-tenant-to-alerts');
    expect(yaml).toContain('type: service');

    expect(yaml).toContain('parameters:');
    expect(yaml).toContain('tenant_name:');

    expect(yaml).toContain('- id: fetch-alerts-file');
    expect(yaml).toContain('- id: move-alerts-file-to-workbench');
    expect(yaml).toContain('- id: parse-alerts');
    expect(yaml).toContain('- id: log-alerts-content');
    expect(yaml).toContain('- id: log-modified-alerts');
    expect(yaml).toContain('- id: log-customer-tag');
    expect(yaml).toContain('- id: createPullRequest');

    expect(yaml).toContain('output:');
    expect(yaml).toContain('title: View the pull request on GitHub');
    expect(yaml).toContain(
      "url: ${{ steps['createPullRequest'].output.remoteUrl }}",
    );
  });
});
