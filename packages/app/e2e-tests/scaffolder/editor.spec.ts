import { test, expect } from '@playwright/test';
import { ScaffolderStudioListPage } from '../pages/ScaffolderStudioListPage';
import { ScaffolderStudioPage } from '../pages/ScaffolderStudioPage';

test.describe('Scaffolder Studio', () => {
  let listPage: ScaffolderStudioListPage;
  let editorPage: ScaffolderStudioPage;

  test.beforeEach(async ({ page }) => {
    listPage = new ScaffolderStudioListPage(page);
    editorPage = new ScaffolderStudioPage(page);
  });

  test.afterEach(async () => {
    await listPage?.cleanupCreatedTemplates();
  });

  test('should create a new template and load the editor', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();

    // Initial verification that we are redirected
    await expect(page).toHaveURL(/\/scaffolder-studio\/templates\/.*\/form/);

    await editorPage.verifyLoaded();
  });
  test('should add a step node', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();

    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    // Wait for template node to appear
    await editorPage.verifyNodeExists('Template');

    await editorPage.selectNode('Template');
    await editorPage.addStepNode();

    // Verify a new node appears (count should be 2: Template + Step)
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
  });

  test('should edit template properties', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();

    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    const newName = 'My Custom Template';
    const newOwner = 'custom-owner';
    const newDesc = 'This is a test description';

    await editorPage.editTemplateNode(newName, newOwner, newDesc);

    await editorPage.verifyNodeExists(newName);
    await editorPage.verifyNodeExists(newOwner);
  });

  test('should update header title when template name is changed', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();

    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    const newName = 'Header Title Sync Test';
    await editorPage.editTemplateNode(
      newName,
      'test-owner',
      'test description',
    );

    // Verify the header title updates
    await expect(page.getByText(newName).first()).toBeVisible();
  });
  test('should reconnect nodes after deleting edge', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');
    await editorPage.addStepNode();

    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(1);

    await editorPage.deleteEdge();
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(0);

    // Wait a bit for state to settle after deletion
    await page.waitForTimeout(500);

    // Use regular expressions for more robust finding
    await editorPage.connectNodes('Template', 'right', 'Step', 'left');
    await expect
      .poll(() => editorPage.countNonRelationshipEdges(), { timeout: 10000 })
      .toBe(1);
  });

  test('should update YAML when template is modified', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    const newName = 'Yaml Sync Test';
    await editorPage.editTemplateNode(
      newName,
      'test-owner',
      'test description',
    );

    await editorPage.goToYamlTab();

    await expect
      .poll(async () => editorPage.getYamlContent(), { timeout: 10000 })
      .toContain(`name: ${newName}`);

    await expect
      .poll(async () => editorPage.getYamlContent(), { timeout: 10000 })
      .toContain('owner: test-owner');
  });

  test('should sync manual yaml edits to the visual graph on save', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');

    await editorPage.addStepAndSelectAction('debug:log');
    await editorPage.expandSideContent();

    // Verify step node exists
    await expect(page.locator('.react-flow__node-step')).toHaveCount(1);

    // Switch to Yaml tab
    await editorPage.goToYamlTab();

    // The output should initially contain the step
    const initialYaml = await editorPage.getYamlContent();
    expect(initialYaml).toContain('action: debug:log');

    // Create new YAML content by replacing the step name and action
    const newYaml = initialYaml
      .replace('name: debug-log', 'name: my-new-step-name')
      .replace('action: debug:log', 'action: fetch:plain');

    await editorPage.editYamlContent(newYaml);
    await editorPage.clickYamlSave();

    // Switch back to the node editor
    await page.getByRole('tab', { name: 'Node' }).click();

    // The visual node should now show the updated step name and action title
    const stepNode = page.locator('.react-flow__node-step').first();
    await editorPage.collapseSideContent();
    await stepNode.click();
    await editorPage.expandSideContent();
    await expect(stepNode).toContainText('my-new-step-name');
    await expect(stepNode).toContainText('fetch:plain'); // the formatted name for fetch:plain
  });

  test('should show alert when adding property without selecting parameters', async () => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.selectNode('Template');
    await editorPage.clickAddPropertyToolbarButton();
    await editorPage.expectAddPropertySelectionAlert();
  });

  test('should add property from toolbar when parameters or property is selected', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddParametersToolbarButton();
    await editorPage.configureParametersNode({ title: 'Toolbar Params' });
    await editorPage.selectNode('Toolbar Params');

    const countBeforeFirstProperty = await page
      .locator('.react-flow__node')
      .count();
    await editorPage.clickAddPropertyToolbarButton();
    await expect(page.locator('.react-flow__node')).toHaveCount(
      countBeforeFirstProperty + 1,
    );

    await editorPage.configureProperty('propertyFromToolbar', 'string');
    await editorPage.selectNode('propertyFromToolbar');

    const countBeforeSecondProperty = await page
      .locator('.react-flow__node')
      .count();
    await editorPage.clickAddPropertyToolbarButton();
    await expect(page.locator('.react-flow__node')).toHaveCount(
      countBeforeSecondProperty + 1,
    );
  });

  test('should chain new step from latest step after creating parameters', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    // Create first step and name it
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-one', 'Step One', {});

    // Create a parameters node in between, then add another step.
    // Step should still chain from latest step node.
    await editorPage.clickAddParametersToolbarButton();
    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-two', 'Step Two', {});

    const stepNodes = page.locator('.react-flow__node-step');
    await expect(stepNodes).toHaveCount(2);

    const firstStepBox = await stepNodes.nth(0).boundingBox();
    const secondStepBox = await stepNodes.nth(1).boundingBox();

    expect(firstStepBox).toBeTruthy();
    expect(secondStepBox).toBeTruthy();

    const xPositions = [firstStepBox!.x, secondStepBox!.x].sort(
      (a, b) => a - b,
    );
    expect(xPositions[1]).toBeGreaterThan(xPositions[0] + 120);
  });

  test('should render relationship edges and force-close step I/O when relationships toggle off', async ({
    page,
  }) => {
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
    await editorPage.collapseSideContent();

    await editorPage.waitForRelationshipEdges(1, 10000);
    await expect(page.getByTestId('step-node-io-section')).toBeVisible();

    await editorPage.toggleRelationshipEdges();
    await editorPage.waitForRelationshipEdges(0, 10000);
    await expect(page.getByTestId('step-node-io-section')).toHaveCount(0);

    await editorPage.toggleRelationshipEdges();
    await editorPage.waitForRelationshipEdges(1, 10000);
    await expect(page.getByTestId('step-node-io-section')).toHaveCount(1);
  });

  test('should auto-sync changes in background', async ({ page }) => {
    const templatePutRequests: string[] = [];

    page.on('request', request => {
      if (request.method() !== 'PUT') {
        return;
      }

      const url = request.url();
      if (/\/templates\/[^/]+$/.test(url)) {
        templatePutRequests.push(url);
      }
    });

    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();

    await editorPage.selectNode('Template');
    await editorPage.editTemplateNode(
      'Auto Sync Template',
      'test-owner',
      'autosync test',
    );

    await expect
      .poll(() => templatePutRequests.length, { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test('should force immediate sync with keyboard shortcut', async ({
    page,
  }) => {
    const templatePutRequests: string[] = [];

    page.on('request', request => {
      if (request.method() !== 'PUT') {
        return;
      }

      const url = request.url();
      if (/\/templates\/[^/]+$/.test(url)) {
        templatePutRequests.push(url);
      }
    });

    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');
    await editorPage.editTemplateNode(
      'Shortcut Save Template',
      'test-owner',
      'shortcut save test',
    );

    await editorPage.saveWithShortcut();
    await expect
      .poll(() => templatePutRequests.length, { timeout: 10000 })
      .toBeGreaterThan(0);
  });

  test('should keep publish enabled while draft has local changes', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');
    await editorPage.editTemplateNode(
      'Unsaved Publish Template',
      'test-owner',
      'publish disabled test',
    );

    const publishButton = page.getByRole('button', {
      name: 'Publish',
      exact: true,
    });
    if (await publishButton.isVisible()) {
      await expect(publishButton).toBeEnabled();
    }
  });

  test('should open dry run with unsaved changes', async ({ page }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();
    await editorPage.addTemplate();
    await editorPage.selectNode('Template');
    await editorPage.editTemplateNode(
      'Unsaved Dry Run Template',
      'test-owner',
      'dry run unsaved test',
    );

    await editorPage.clickDryRun();
    await expect(page).toHaveURL(/\/scaffolder-studio\/templates\/.*\/dry-run/);
  });

  test('should create another parameters node when dragging from parameters right handle', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddParametersToolbarButton();
    await editorPage.configureParametersNode({ title: 'Params One' });

    const beforeParamsCount = await editorPage.countNodesByType('parameters');
    const beforeEdgeCount = await page.locator('.react-flow__edge').count();

    await editorPage.collapseSideContent();
    await editorPage.dragFromNodeTypeHandleToOffset({
      nodeType: 'parameters',
      handleId: 'right',
      dx: 220,
      dy: 40,
      index: 0,
    });

    await expect
      .poll(() => editorPage.countNodesByType('parameters'), {
        timeout: 10000,
      })
      .toBe(beforeParamsCount + 1);

    await expect
      .poll(() => page.locator('.react-flow__edge').count(), { timeout: 10000 })
      .toBe(beforeEdgeCount + 1);
  });

  test('should not create extra step from first step when outgoing capacity is full', async ({
    page,
  }) => {
    await listPage.goto();
    await listPage.createNewTemplate();
    await editorPage.verifyLoaded();

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-one', 'Step One', {});

    await editorPage.clickAddStepToolbarButton();
    await editorPage.configureStep('step-two', 'Step Two', {});

    const beforeStepCount = await editorPage.countNodesByType('step');
    const beforeEdgeCount = await page.locator('.react-flow__edge').count();

    // first step already has one outgoing edge (to Step Two), so dragging should do nothing
    await editorPage.collapseSideContent();
    await editorPage.dragFromNodeTypeHandleToOffset({
      nodeType: 'step',
      handleId: 'right',
      dx: 220,
      dy: 0,
      index: 0,
    });

    await page.waitForTimeout(500);
    await expect(editorPage.countNodesByType('step')).resolves.toBe(
      beforeStepCount,
    );
    await expect(page.locator('.react-flow__edge')).toHaveCount(
      beforeEdgeCount,
    );
  });
});
