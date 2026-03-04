import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Relationship I/O', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('property -> step input drag inserts token and auto-enables relationship view', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.fitView();

    await editorPage.clickAddParametersToolbarButton();
    await editorPage.configureParametersNode({ title: 'Input Params' });
    await editorPage.selectNode('Input Params');
    await editorPage.clickAddPropertyToolbarButton();
    await editorPage.configureProperty('repoUrl', 'string');

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('build', 'Build', { message: '' });
    await editorPage.collapseSideContent();

    await editorPage.toggleStepIoByNodeText('Build');
    const buildNode = editorPage.getNodeLocatorByText('Build');
    await expect(
      buildNode.getByTestId('step-node-input-row-message'),
    ).toBeVisible();

    await editorPage.waitForRelationshipEdges(0);
    await editorPage.fitView();
    await editorPage.connectRelationship(
      'repoUrl',
      'out:value',
      'Build',
      'in:message',
    );
    await editorPage.waitForRelationshipEdges(count => count >= 1);

    await editorPage.goToYamlTab();
    const yaml = await editorPage.getYamlContent();
    expect(yaml).toMatch(
      /message:\s*['"]?\$\{\{\s*parameters\.repoUrl\s*\}\}['"]?/,
    );
    expect(yaml).not.toContain('uiState');
  });

  test('step output -> if drag inserts step token format (not parameter token)', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.fitView();

    await editorPage.addStepAndSelectAction('fs:readdir');
    await editorPage.configureStep('readDir', 'Read Dir', {});

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('logFiles', 'Log Files', {});
    await editorPage.collapseSideContent();
    await editorPage.waitForTimeout(1000); // Wait for sidebar to close and layout to settle

    await editorPage.toggleStepIoByNodeText('Read Dir');
    const sourceNode = editorPage.getNodeLocatorByText('Read Dir');
    await expect(
      sourceNode.getByTestId('step-node-output-row-files'),
    ).toBeVisible();

    await editorPage.fitView();
    await editorPage.connectRelationship(
      'Read Dir',
      'out:files',
      'Log Files',
      'in:if',
    );

    await editorPage.waitForRelationshipEdges(count => count >= 1);

    await editorPage.goToYamlTab();
    const yaml = await editorPage.getYamlContent();
    expect(yaml).toMatch(
      /if:\s*['"]?\$\{\{\s*steps\['readDir'\]\.output\['files'\]\s*\}\}['"]?/,
    );
    expect(yaml).not.toContain('parameters.files');
  });

  test('Cmd/Ctrl+4 toggles overlay edges and force-expansion lifecycle', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.fitView();

    await editorPage.clickAddParametersToolbarButton();
    await editorPage.configureParametersNode({ title: 'Input Params' });
    await editorPage.selectNode('Input Params');
    await editorPage.clickAddPropertyToolbarButton();
    await editorPage.configureProperty('repoUrl', 'string');

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('build', 'Build', {
      message: '${{ parameters.repoUrl }}',
    });
    await editorPage.collapseSideContent();

    const buildNode = editorPage.getNodeLocatorByText('Build');
    await editorPage.waitForRelationshipEdges(0);
    await expect(buildNode.getByTestId('step-node-io-section')).toHaveCount(0);

    await editorPage.pressRelationshipShortcut();
    await editorPage.waitForRelationshipEdges(count => count >= 1);
    await expect(buildNode.getByTestId('step-node-io-section')).toBeVisible();

    await editorPage.pressRelationshipShortcut();
    await editorPage.waitForRelationshipEdges(0);
    await expect(buildNode.getByTestId('step-node-io-section')).toHaveCount(0);
  });

  test('manual I/O expansion persists across reload and YAML remains unchanged', async ({
    page,
  }) => {
    await listPage.goto();
    const templateId = await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.fitView();

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('build', 'Build', {});
    await editorPage.collapseSideContent();

    await editorPage.toggleStepIoByNodeText('Build');
    await editorPage.waitForDraftIoExpanded(templateId, true);

    await page.reload();
    await editorPage.verifyLoaded();
    await editorPage.verifyNodeExists('Build');

    const buildNode = editorPage.getNodeLocatorByText('Build');
    await expect(buildNode.getByTestId('step-node-io-section')).toBeVisible();

    await editorPage.goToYamlTab();
    const yaml = await editorPage.getYamlContent();
    expect(yaml).not.toContain('uiState');
    expect(yaml).not.toContain('ioExpanded');
  });
});
