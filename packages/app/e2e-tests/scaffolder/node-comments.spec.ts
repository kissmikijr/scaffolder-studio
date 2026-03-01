import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Node Comments', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('should display a badge when a comment is added to a step', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('comment-step', 'Comment Test Step', {});
    await editorPage.selectNode('Comment Test Step');

    // open the editor and add a comment via UI
    await editorPage.openCommentEditor('Comment Test Step');
    await editorPage.addComment('This is a test comment');

    // badge should now be visible
    await editorPage.expectNodeCommentBadgeVisible('Comment Test Step');
  });

  test('should hide the badge when a comment is removed', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('comment-step', 'Comment Hide Step', {});
    await editorPage.openCommentEditor('Comment Hide Step');
    await editorPage.addComment('To be deleted');
    await editorPage.expectNodeCommentBadgeVisible('Comment Hide Step');

    // remove the comment via UI
    await editorPage.openCommentEditor('Comment Hide Step');
    await editorPage.addComment('');
  });
});
