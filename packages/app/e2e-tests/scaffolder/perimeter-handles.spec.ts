import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Perimeter Handles', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('connects nodes through the outside perimeter handles', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('buildA', 'Build A', {});
    await editorPage.deleteEdge();

    await editorPage.selectNode('Template');
    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.configureStep('buildB', 'Build B', {});
    await editorPage.collapseSideContent();
    await editorPage.fitView();

    const edgeCountBefore = await editorPage.countNonRelationshipEdges();
    await editorPage.connectNodes('Build B', 'right', 'Build A', 'left');
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(edgeCountBefore + 1);

    await expect(page.locator('.react-flow__node-step')).toHaveCount(2);
  });

  test('renders a live preview path while dragging from a perimeter handle', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.collapseSideContent();
    await editorPage.fitView();

    await editorPage.beginConnectionDragFromHandle(
      'Template',
      'source',
      'right',
      {
        x: 140,
        y: 0,
      },
    );

    const previewPath = await editorPage.getConnectionPreviewPathD();
    expect(previewPath).toContain('M');

    await editorPage.endConnectionDrag();
  });
});
