import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Zen Mode', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('hides non-relationship edges in zen mode and restores them when disabled', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-a', 'Step A', {});
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-b', 'Step B', {});
    await editorPage.fitView();

    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBeGreaterThan(0);

    await editorPage.collapseSideContent();
    await editorPage.toggleZenMode();
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(0);

    await editorPage.toggleZenMode();
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test('supports F keyboard shortcut for zen mode toggle', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-a', 'Step A', {});
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-b', 'Step B', {});

    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBeGreaterThan(0);

    await editorPage.collapseSideContent();
    await editorPage.pressZenShortcut();
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(0);

    await editorPage.pressZenShortcut();
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test('focuses selected node and directly relationship-connected neighbors', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddParametersToolbarButton();
    await editorPage.configureParametersNode({ title: 'Input Params' });
    await editorPage.selectNode('Input Params');
    await editorPage.clickAddPropertyToolbarButton();
    await editorPage.configureProperty('repoUrl', 'string');

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('build', 'Build', {
      message: '${{ parameters.repoUrl',
    });

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('noise', 'Noise', {
      message: 'plain text',
    });

    await editorPage.collapseSideContent();
    await editorPage.fitView();
    await editorPage.waitForRelationshipEdges(count => count >= 1);

    await editorPage.selectNode('Build');
    await editorPage.toggleZenMode();

    const getNodeOpacity = async (text: string) => {
      const value = await editorPage
        .getNodeLocatorByText(text)
        .evaluate(el => window.getComputedStyle(el).opacity);
      return Number(value);
    };

    await expect
      .poll(() => getNodeOpacity('Build'), { timeout: 10000 })
      .toBe(1);
    await expect
      .poll(() => getNodeOpacity('repoUrl'), { timeout: 10000 })
      .toBe(1);
    await expect
      .poll(() => getNodeOpacity('Noise'), { timeout: 10000 })
      .toBeLessThan(0.2);
    await expect
      .poll(() => getNodeOpacity('Untitled'), { timeout: 10000 })
      .toBeLessThan(0.2);
  });
});
