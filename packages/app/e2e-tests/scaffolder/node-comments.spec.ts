import { test } from '@playwright/test';
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

  test('should persist a comment in the popover for a step', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('comment-step', 'Comment Test Step', {});
    await editorPage.selectNode('Comment Test Step');

    // open the editor and add a comment via UI
    await editorPage.openCommentEditor('Comment Test Step');
    await editorPage.addComment('This is a test comment');

    // comment should be persisted in the popover field
    await editorPage.openCommentEditor('Comment Test Step');
    await editorPage.expectCommentValue('This is a test comment');
  });

  test('should clear comment content when a comment is removed', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('comment-step', 'Comment Hide Step', {});
    await editorPage.openCommentEditor('Comment Hide Step');
    await editorPage.addComment('To be deleted');

    // remove the comment via UI
    await editorPage.openCommentEditor('Comment Hide Step');
    await editorPage.addComment('');

    // confirm the field is now empty
    await editorPage.openCommentEditor('Comment Hide Step');
    await editorPage.expectCommentValue('');
  });
});
