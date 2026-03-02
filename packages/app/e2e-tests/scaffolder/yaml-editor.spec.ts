import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio - Node YAML Editor', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('should display node YAML in side drawer when toggled', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('yaml-step', 'YAML Test Step', {});
    await editorPage.selectNode('YAML Test Step');

    await editorPage.toggleNodeYamlEditor();
    const content = await editorPage.getNodeYamlContent();

    // Check basic known fields
    expect(content).toContain('id: yaml-step');
    expect(content).toContain('name: YAML Test Step');
  });

  test('should persist arbitrary YAML fields alongside form edits', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    // 1. Create a step
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('arbitrary-step', 'Arbitrary YAML Step', {});
    await editorPage.selectNode('Arbitrary YAML Step');

    // 2. Open YAML and add a custom field
    await editorPage.toggleNodeYamlEditor();
    const initialContent = await editorPage.getNodeYamlContent();
    const modifiedContent = `${initialContent}\ncustomTimeout: 600\ndependsOn: another-step`;
    await editorPage.editNodeYamlContent(modifiedContent);

    // 3. Switch back to Form and update a known field
    await editorPage.toggleNodeYamlEditor();
    await editorPage.configureStep('', 'Updated YAML Step', {});

    // 4. Switch *back* to YAML and verify the custom fields survived the form edit
    await editorPage.toggleNodeYamlEditor();
    const finalContent = await editorPage.getNodeYamlContent();

    expect(finalContent).toContain('name: Updated YAML Step');
    expect(finalContent).toContain('customTimeout: 600');
    expect(finalContent).toContain('dependsOn: another-step');
  });

  test('should update visual node canvas when YAML name changes', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('canvas-sync', 'Original Canvas Name', {});
    await editorPage.selectNode('Original Canvas Name');

    await editorPage.toggleNodeYamlEditor();

    const initialContent = await editorPage.getNodeYamlContent();
    const modifiedContent = initialContent.replace(
      'name: Original Canvas Name',
      'name: New Canvas Name',
    );

    await editorPage.editNodeYamlContent(modifiedContent);

    // After typing, visual node shouldn't change until save/unfocus.
    // Wait for the debounced save or manually toggle back to trigger blur.
    await editorPage.toggleNodeYamlEditor();

    // The node on the canvas should now say "New Canvas Name"
    await editorPage.verifyNodeExists('New Canvas Name');
  });

  test('should include arbitrary YAML fields in the final template YAML', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    // 1. Create a step
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep(
      'serialization-step',
      'Serialization Step',
      {},
    );
    await editorPage.selectNode('Serialization Step');

    // 2. Open Node YAML and add a custom field
    await editorPage.toggleNodeYamlEditor();
    const initialContent = await editorPage.getNodeYamlContent();
    const modifiedContent = `${initialContent}\nmyCustomField: "this should be in final yaml"`;
    await editorPage.editNodeYamlContent(modifiedContent);

    // 3. Switch back to form view to trigger save and collapse
    await editorPage.toggleNodeYamlEditor();

    // 4. Go to the main Template YAML tab and verify the serialization
    await editorPage.goToYamlTab();
    const finalTemplateYaml = await editorPage.getYamlContent();

    expect(finalTemplateYaml).toContain(
      'myCustomField: this should be in final yaml',
    );
  });
});
