import { Page, Locator, expect } from '@playwright/test';

export class ScaffolderStudioPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public getPage() {
    return this.page;
  }

  async verifyLoaded() {
    await expect(this.page.getByTestId('toolbar-add-step-button')).toBeVisible({
      timeout: 15000,
    });
    await expect(this.page.getByRole('tab', { name: 'Node' })).toBeVisible({
      timeout: 15000,
    });
  }

  async addTemplate() {
    await expect(
      this.page
        .locator('.react-flow__node')
        .filter({ hasText: 'Template' })
        .first(),
    ).toBeVisible();
  }

  async clickAddStepToolbarButton() {
    const countBefore = await this.page.locator('.react-flow__node').count();
    await this.page.getByTestId('toolbar-add-step-button').click();
    await expect(async () => {
      const countAfter = await this.page.locator('.react-flow__node').count();
      expect(countAfter).toBeGreaterThan(countBefore);
    }).toPass({ timeout: 10000 });
  }

  async clickAddParametersToolbarButton() {
    const countBefore = await this.page.locator('.react-flow__node').count();
    await this.page.getByTestId('toolbar-add-parameters-button').click();
    await expect(async () => {
      const countAfter = await this.page.locator('.react-flow__node').count();
      expect(countAfter).toBeGreaterThan(countBefore);
    }).toPass({ timeout: 10000 });
  }

  async clickAddPropertyToolbarButton() {
    await this.page.getByTestId('toolbar-add-property-button').click();
  }

  async clickAddOutputToolbarButton() {
    await this.page.getByTestId('toolbar-add-output-button').click();
  }

  async toggleRelationshipEdges() {
    await this.page.getByTestId('dependency-edges-toggle-button').click();
  }

  async pressRelationshipShortcut() {
    await this.page.keyboard.press('ControlOrMeta+4');
  }

  async fitView() {
    await this.page.getByTestId('toolbar-fit-view-button').click();
    await this.page.waitForTimeout(500); // Wait for animation
  }

  async waitForTimeout(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  async countRelationshipEdges() {
    return this.page.locator('.react-flow__edge[data-id*="rel-"]').count();
  }

  async waitForRelationshipEdges(
    countOrPredicate: number | ((count: number) => boolean),
    timeout = 10000,
  ) {
    if (typeof countOrPredicate === 'number') {
      await expect
        .poll(() => this.countRelationshipEdges(), { timeout })
        .toBe(countOrPredicate);
      return;
    }

    await expect
      .poll(async () => countOrPredicate(await this.countRelationshipEdges()), {
        timeout,
      })
      .toBe(true);
  }

  async readDraftFromLocalStorage(templateId: string): Promise<any | null> {
    const key = `scaffolder-studio:draft:${templateId}`;
    return this.page.evaluate(storageKey => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }, key);
  }

  async waitForDraftIoExpanded(templateId: string, expected: boolean) {
    const key = `scaffolder-studio:draft:${templateId}`;
    await expect
      .poll(
        () =>
          this.page.evaluate(
            ({ storageKey, expectedValue }) => {
              const raw = localStorage.getItem(storageKey);
              if (!raw) return false;
              try {
                const parsed = JSON.parse(raw);
                const nodes = Array.isArray(parsed?.state?.nodes)
                  ? parsed.state.nodes
                  : [];
                return nodes.some(
                  (node: any) =>
                    node?.type === 'step' &&
                    node?.data?.uiState?.ioExpanded === expectedValue,
                );
              } catch {
                return false;
              }
            },
            { storageKey: key, expectedValue: expected },
          ),
        { timeout: 10000 },
      )
      .toBe(true);
  }

  getNodeLocatorByText(text: string): Locator {
    return this.page
      .locator('.react-flow__node')
      .filter({ hasText: text })
      .first();
  }

  async clickDryRun() {
    await this.page
      .getByRole('button', { name: 'Dry Run', exact: true })
      .click();
  }

  async clickSave() {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async expectSaveDisabled() {
    await expect(
      this.page.getByRole('button', { name: 'Save', exact: true }),
    ).toBeDisabled();
  }

  async expectSaveEnabled() {
    await expect(
      this.page.getByRole('button', { name: 'Save', exact: true }),
    ).toBeEnabled();
  }

  async saveWithShortcut() {
    await this.page.keyboard.press('ControlOrMeta+s');
  }

  async expectPublishDisabled() {
    await expect(
      this.page.getByRole('button', { name: 'Publish', exact: true }),
    ).toBeDisabled();
  }

  async addStepNode(sourceNodeText?: string) {
    await this.collapseSideContent();
    if (sourceNodeText) {
      await this.selectNode(sourceNodeText);
    } else {
      const templateNode = this.page
        .locator('.react-flow__node-template')
        .first();
      if ((await templateNode.count()) > 0) {
        await templateNode.click({ force: true });
      }
    }

    await this.clickAddStepToolbarButton();
  }

  async verifyNodeExists(text: string) {
    await expect(this.getNodeLocatorByText(text)).toBeVisible();
  }

  async addParametersNode() {
    const beforeCount = await this.page
      .locator('.react-flow__node-parameters')
      .count();
    await this.clickAddParametersToolbarButton();
    await expect(async () => {
      const afterCount = await this.page
        .locator('.react-flow__node-parameters')
        .count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    }).toPass({ timeout: 10000 });
  }
  async configureParametersNode({ title }: { title: string }) {
    await this.expandSideContent();
    await this.page
      .locator('.react-flow__node-parameters')
      .last()
      .click({ force: true });
    await this.page.getByRole('textbox', { name: 'Title' }).fill(title);
  }

  async selectNode(text: string) {
    await this.getNodeLocatorByText(text).click({ force: true });
  }

  async toggleStepIoByNodeText(nodeText: string) {
    const node = this.getNodeLocatorByText(nodeText);
    await expect(node).toBeVisible();
    const toggleButton = node.getByTestId('node-output-toggle-button');
    await expect(toggleButton).toBeAttached();
    await toggleButton.dispatchEvent('click');
  }

  async editTemplateNode(name: string, owner: string, description: string) {
    await this.expandSideContent();
    await this.page.getByLabel('Name').fill(name);
    await this.page
      .getByPlaceholder('Type to search owners...')
      .first()
      .fill(owner);
    // Click away to close autocomplete or select
    await this.page.keyboard.press('Escape');
    await this.page.getByLabel('Description').fill(description);
  }
  async goToYamlTab() {
    await this.expandSideContent();
    await this.page.getByRole('tab', { name: 'Yaml' }).click();
  }
  async goToPrefabsTab() {
    await this.expandSideContent();
    await this.page.getByRole('tab', { name: 'Prefabs' }).click();
  }
  async verifyPrefabVisible(title: string, sectionTitle?: string) {
    if (sectionTitle) {
      const section = this.page
        .locator('tr')
        .filter({ hasText: sectionTitle.toUpperCase() });
      await expect(section).toBeVisible({ timeout: 15000 });
    }
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 15000 });
  }

  async getYamlContent() {
    const editor = this.page.locator('.cm-content');
    await expect(editor).toBeVisible();
    return await editor.innerText();
  }

  async editYamlContent(newContent: string) {
    const editor = this.page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();

    // Select all text
    await this.page.keyboard.press('ControlOrMeta+a');

    // Delete existing content
    await this.page.keyboard.press('Backspace');

    // Type new content
    await editor.fill(newContent);
  }

  async clickYamlSave() {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async deleteEdge() {
    const edge = this.page.locator('.react-flow__edge').first();
    await expect(edge).toBeVisible();
    await edge.click({ force: true });
    await this.page.keyboard.press('Backspace');
  }

  async connectNodes(
    sourceNodeText: string,
    sourceHandleId: string,
    targetNodeText: string,
    targetHandleId: string,
  ) {
    await this.collapseSideContent();
    const initialEdgeCount = await this.page
      .locator('.react-flow__edge')
      .count();

    const sourceNode = this.getNodeLocatorByText(sourceNodeText);
    const targetNode = this.getNodeLocatorByText(targetNodeText);

    await expect(sourceNode).toBeVisible({ timeout: 5000 });
    await expect(targetNode).toBeVisible({ timeout: 5000 });

    // Try more specific test-id based locator for StepNode handles, fallback to generic
    const sourceHandle = sourceNode
      .locator(
        `[data-testid^="step-node-source-handle-${sourceHandleId}-"], .react-flow__handle.source[data-handleid="${sourceHandleId}"]:not(.step-node-io-handle)`,
      )
      .first();
    const targetHandle = targetNode
      .locator(
        `[data-testid^="step-node-handle-${targetHandleId}-"], .react-flow__handle.target[data-handleid="${targetHandleId}"]:not(.step-node-io-handle)`,
      )
      .first();

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      // On first attempt, use fitView. On subsequent attempts, try more aggressive panning.
      if (attempt === 0) {
        await this.fitView();
      } else {
        await this.panNodeToViewportCenter(sourceNode);
        await this.panNodeToViewportCenter(targetNode);
      }

      await sourceHandle.scrollIntoViewIfNeeded();
      await targetHandle.scrollIntoViewIfNeeded();

      await this.dragBetweenHandles(sourceHandle, targetHandle);
      try {
        await expect(async () => {
          const edgeCount = await this.page
            .locator('.react-flow__edge')
            .count();
          expect(edgeCount).toBeGreaterThan(initialEdgeCount);
        }).toPass({ timeout: 5000 });
        return;
      } catch (error) {
        lastError = error;
        // Small wait between attempts
        await this.page.waitForTimeout(500);
      }
    }
    throw lastError;
  }

  async connectRelationship(
    sourceNodeText: string,
    sourceHandleId: string,
    targetNodeText: string,
    targetHandleId: string,
    expectEdgeIncrease = true,
  ) {
    await this.collapseSideContent();
    const initialRelationshipEdgeCount = await this.countRelationshipEdges();
    const sourceNode = this.getNodeLocatorByText(sourceNodeText);
    const targetNode = this.getNodeLocatorByText(targetNodeText);

    await expect(sourceNode).toBeVisible({ timeout: 5000 });
    await expect(targetNode).toBeVisible({ timeout: 5000 });

    await this.panNodeToViewportCenter(sourceNode);
    await this.panNodeToViewportCenter(targetNode);

    const sourceHandle = sourceNode.locator(
      `.react-flow__handle.source[data-handleid="${sourceHandleId}"]`,
    );
    const targetHandle = targetNode.locator(
      `.react-flow__handle.target[data-handleid="${targetHandleId}"]`,
    );

    // Ensure handles are in view. Since fitView() was likely called, they should be,
    // but we'll scroll them into view just in case they are slightly clipped.
    await sourceHandle.scrollIntoViewIfNeeded();
    await targetHandle.scrollIntoViewIfNeeded();

    await expect(sourceHandle).toBeVisible({ timeout: 5000 });
    await expect(targetHandle).toBeVisible({ timeout: 5000 });

    if (expectEdgeIncrease) {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.dragBetweenHandles(sourceHandle, targetHandle);
        try {
          await expect
            .poll(() => this.countRelationshipEdges(), { timeout: 3500 })
            .toBeGreaterThan(initialRelationshipEdgeCount);
          return;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    } else {
      await this.dragBetweenHandles(sourceHandle, targetHandle);
      await expect
        .poll(() => this.countRelationshipEdges(), { timeout: 10000 })
        .toBe(initialRelationshipEdgeCount);
    }
  }

  async addProperty({
    parentNodeId,
    parentNodeText,
  }: {
    parentNodeId?: string;
    parentNodeText?: string;
  }) {
    if (parentNodeId) {
      await this.page
        .locator(`.react-flow__node[data-id="${parentNodeId}"]`)
        .click();
    } else if (parentNodeText) {
      await this.page
        .locator('.react-flow__node')
        .filter({ hasText: parentNodeText })
        .first()
        .click();
    }
    await this.clickAddPropertyToolbarButton();
  }

  async expectAddPropertySelectionAlert() {
    await expect(
      this.page.getByText(
        'Select a parameters or property node first to add a property',
      ),
    ).toBeVisible();
  }

  async configureProperty(
    name: string,
    type: string,
    title?: string,
    description?: string,
    required?: boolean,
  ) {
    // Ensure sidebar is open
    await this.expandSideContent();

    await this.page.getByLabel('Name', { exact: true }).fill(name);
    await this.page.getByLabel('Type').selectOption(type);

    if (title) {
      await this.page.getByLabel('Title').fill(title);
    }
    if (description) {
      await this.page.getByLabel('Description').fill(description);
    }
    if (required !== undefined) {
      const checkbox = this.page.getByLabel('Required');
      const isChecked = await checkbox.isChecked();
      if (isChecked !== required) {
        await checkbox.click();
      }
    }
  }

  async selectAction(actionId: string) {
    // Assumes step is selected.
    await this.expandSideContent();

    const input = this.page.getByPlaceholder('Start typing...');
    await input.click();
    await input.fill(actionId);
    // Wait for options to appear
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async addStepAndSelectAction(actionId: string, sourceNodeText?: string) {
    await this.addStepNode(sourceNodeText);
    // After adding, the new node is selected.
    await this.selectAction(actionId);
  }

  async configureStep(
    id: string,
    name: string,
    formValues: Record<string, any>,
  ) {
    // Assumes step is selected.
    await this.expandSideContent();

    if (id) {
      await this.page.getByLabel('id', { exact: true }).fill(id);
    }
    if (name) {
      await this.page.getByLabel('name', { exact: true }).fill(name);
    }

    // Ensure the entry is visible in the side content
    const sideContent = this.page.locator('[data-testid="side-content-form"]');
    if (!(await sideContent.isVisible())) {
      await this.expandSideContent();
    }

    // Fill RJSF form values
    for (const [key, value] of Object.entries(formValues)) {
      // Case 1: Standard inputs (MUI TextField, etc.)
      const label = this.page.getByLabel(key, { exact: false }).first();
      if (await label.isVisible()) {
        const tagName = await label.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'input' || tagName === 'textarea') {
          await label.fill(value.toString());
          continue;
        } else if (tagName === 'select') {
          await label.selectOption(value.toString());
          continue;
        }
      }

      // Case 2: Lexical-based input (contenteditable div)
      // Look for a textbox within the container that has the label text or is near it
      const lexicalTextbox = this.page
        .locator(
          `xpath=//*[translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')=translate('${key}', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') or translate(@label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')=translate('${key}', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')]/ancestor::div[contains(@class, "MuiBox-root") or contains(@class, "MuiFormControl-root")][1]//*[ @role="textbox" ]`,
        )
        .first();

      let targetTextbox = lexicalTextbox;
      if (!(await targetTextbox.isVisible())) {
        // Relaxed search for Lexical
        targetTextbox = this.page
          .locator(
            `xpath=//*[contains(text(), "${key}")]/ancestor::div[1]//*[ @role="textbox" ]`,
          )
          .first();
      }

      if (await targetTextbox.isVisible()) {
        await targetTextbox.click({ force: true });
        await this.page.waitForTimeout(300);
        await targetTextbox.focus();

        // Select all and delete to clear existing content
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(200);

        // Type the value slowly
        await this.page.keyboard.type(value.toString(), { delay: 50 });
        await this.page.waitForTimeout(300);

        // Trigger blur to ensure state committed
        await this.page.keyboard.press('Tab');
        continue;
      }

      // Aggressive fallback Case 2b: Search for any element with the key text and find nearest role="textbox"
      const anyLabel = this.page
        .locator(`xpath=//*[contains(text(), "${key}")]`)
        .first();
      if (await anyLabel.isVisible()) {
        const nearestTextbox = anyLabel
          .locator('xpath=./ancestor::div[1]//*[ @role="textbox" ]')
          .first();
        if (await nearestTextbox.isVisible()) {
          await nearestTextbox.click({ force: true });
          await nearestTextbox.evaluate((el, val) => {
            el.focus();
            document.execCommand('selectAll', false);
            document.execCommand('delete', false);
            document.execCommand('insertText', false, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.blur();
          }, value.toString());
          await this.page.waitForTimeout(200);
          await this.page.keyboard.press('Tab');
          continue;
        }
      }

      // Case 3: Fallback to placeholder search
      const byPlaceholder = this.page.getByPlaceholder(key);
      if (await byPlaceholder.isVisible()) {
        const tagName = await byPlaceholder.evaluate(el =>
          el.tagName.toLowerCase(),
        );
        if (
          tagName === 'div' &&
          (await byPlaceholder.getAttribute('role')) === 'textbox'
        ) {
          await byPlaceholder.click();
          await this.page.keyboard.press('ControlOrMeta+a');
          await this.page.keyboard.press('Backspace');
          await this.page.keyboard.type(value.toString());
        } else {
          await byPlaceholder.fill(value.toString());
        }
      }
    }
  }

  async configureOutput(links?: Array<{ title: string; url: string }>) {
    // Output node side content
    await this.expandSideContent();
    const sidePanel = this.page.getByTestId('sidecontent-panel');

    if (links) {
      for (const link of links) {
        // Find the "New Link" dashed box precisely using the new test ID.
        const newLinkBox = sidePanel.getByTestId('new-link-box');

        await expect(newLinkBox).toBeVisible({ timeout: 10000 });

        // Title
        await newLinkBox.getByLabel('Title').fill(link.title);

        // URL field is StepNodeExpressionField
        const urlField = newLinkBox
          .locator('div', { hasText: /^URL$/ })
          .first();
        const urlTarget = urlField.locator('[role="textbox"]');
        await urlTarget.click();
        await this.page.keyboard.type(link.url);

        // Click Add
        const addButton = newLinkBox.getByTestId('add-link-button');
        await addButton.click();

        // Wait for the form to clear (Title should be empty again)
        await expect(newLinkBox.getByLabel('Title')).toHaveValue('');
      }
    }
  }

  async panBy(dx: number, dy: number) {
    const pane = this.page.locator('.react-flow__pane');
    await expect(pane).toBeVisible();

    // Manually dispatch wheel event to ensure it's handled by React Flow
    // deltaX > 0 scrolls right (moves content left)
    const deltaX = -dx;
    const deltaY = -dy;

    await pane.evaluate(
      (el, { deltaX: dX, deltaY: dY }) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: dX,
            deltaY: dY,
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
      },
      { deltaX, deltaY },
    );

    await this.page.waitForTimeout(500); // Wait for render
  }

  async countNodesByType(type: string) {
    return this.page.locator(`.react-flow__node-${type}`).count();
  }

  async collapseSideContent() {
    const panel = this.page.getByTestId('sidecontent-panel');
    await expect(panel).toBeVisible();
    const collapsed = await panel.getAttribute('data-collapsed');
    if (collapsed === 'true') {
      return;
    }
    await this.page.getByTestId('sidecontent-toggle-button').click();
    await expect(panel).toHaveAttribute('data-collapsed', 'true');
  }

  async expandSideContent() {
    const panel = this.page.getByTestId('sidecontent-panel');
    await expect(panel).toBeVisible();
    const collapsed = await panel.getAttribute('data-collapsed');
    if (collapsed === 'false') {
      return;
    }
    await this.page.getByTestId('sidecontent-toggle-button').click();
    await expect(panel).toHaveAttribute('data-collapsed', 'false');
  }

  private async dragBetweenHandles(
    sourceHandle: Locator,
    targetHandle: Locator,
  ) {
    if (
      !(await sourceHandle.isVisible()) ||
      !(await targetHandle.isVisible())
    ) {
      await this.fitView();
    }

    await sourceHandle.scrollIntoViewIfNeeded();
    await targetHandle.scrollIntoViewIfNeeded();

    await sourceHandle.dragTo(targetHandle, {
      force: true,
      timeout: 10000,
    });

    await this.page.waitForTimeout(500);
  }

  private async panNodeToViewportCenter(node: ReturnType<Page['locator']>) {
    const box = await node.boundingBox();
    const viewport = this.page.viewportSize();

    if (!box || !viewport) {
      return;
    }

    const nodeCenterX = box.x + box.width / 2;
    const nodeCenterY = box.y + box.height / 2;
    const viewportCenterX = viewport.width / 2;
    const viewportCenterY = viewport.height / 2;

    const dx = viewportCenterX - nodeCenterX;
    const dy = viewportCenterY - nodeCenterY;

    // Pan only when significantly off-center to avoid noisy micro-movements.
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
      await this.panBy(dx, dy);
    }
  }

  async dragFromNodeTypeHandleToOffset({
    nodeType,
    handleId,
    dx,
    dy,
    index = 0,
  }: {
    nodeType: string;
    handleId: string;
    dx: number;
    dy: number;
    index?: number;
  }) {
    await this.collapseSideContent();
    const node = this.page.locator(`.react-flow__node-${nodeType}`).nth(index);
    await expect(node).toBeVisible();
    await node.scrollIntoViewIfNeeded();
    await this.panNodeToViewportCenter(node);

    const handle = node.locator(
      `.react-flow__handle.source[data-handleid="${handleId}"]`,
    );
    await expect(handle).toBeVisible();
    await handle.scrollIntoViewIfNeeded();

    let box = await handle.boundingBox();
    if (!box) {
      throw new Error('Handle bounding box not found');
    }

    const viewport = this.page.viewportSize();
    if (
      viewport &&
      (box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height)
    ) {
      await this.panBy(-320, 0);
      await handle.scrollIntoViewIfNeeded();
      box = await handle.boundingBox();
      if (!box) {
        throw new Error('Handle bounding box not found after panning');
      }
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 16 });
    await this.page.mouse.up();
  }

  async waitForThumbnail(projectId: string) {
    const key = `project-thumbnail-${projectId}`;
    await this.page.waitForFunction(
      storageKey => {
        const item = localStorage.getItem(storageKey);
        if (!item) return false;
        try {
          const parsed = JSON.parse(item);
          return !!parsed.dataUrl;
        } catch (e) {
          return false;
        }
      },
      key,
      { timeout: 15000 },
    );
  }

  // --- Node Comment Helpers ---

  async openCommentEditor(nodeText: string) {
    await this.selectNode(nodeText);
    await this.expandSideContent();
    const commentBtn = this.page.getByTestId('sidebar-comment-button');
    await expect(commentBtn).toBeVisible();
    await commentBtn.click();

    const popover = this.page.getByTestId('comment-input-popover').first();
    await expect(popover).toBeVisible({ timeout: 10000 });
  }

  async addComment(comment: string) {
    const popover = this.page.getByTestId('comment-input-popover').first();
    await expect(popover).toBeVisible();

    // Existing comments open in read-only mode. Use the kebab menu to enter edit mode.
    const submitButton = popover.getByTestId('comment-input-submit');
    if (!(await submitButton.isVisible())) {
      await popover.getByTestId('comment-input-menu-button').click();
      await this.page.getByTestId('comment-input-edit-menu-item').click();
      await expect(submitButton).toBeVisible();
    }

    const fieldRoot = popover.getByTestId('comment-input-field');
    const input = fieldRoot.locator('textarea, input').first();
    await expect(input).toBeVisible();
    await input.fill(comment);

    await submitButton.click();
    await expect(popover).not.toBeVisible();
  }

  async expectCommentValue(comment: string) {
    const popover = this.page.getByTestId('comment-input-popover').first();
    await expect(popover).toBeVisible();
    const fieldRoot = popover.getByTestId('comment-input-field');
    const input = fieldRoot.locator('textarea, input').first();
    await expect(input).toHaveValue(comment);
  }

  async addCommentViaYaml(nodeText: string, comment: string) {
    // 1. Select node which reliably opens the sidebar
    await this.selectNode(nodeText);

    // 2. Switch to YAML
    await this.toggleNodeYamlEditor();

    // 3. Inject a 'comment' key
    const currentYaml = await this.getNodeYamlContent();
    // Use a simple replace or append strategy
    let yamlWithComment = '';
    const hasComment = currentYaml.includes('comment:');
    if (hasComment) {
      yamlWithComment = currentYaml.replace(
        /comment:.*(\n|$)/g,
        `comment: "${comment}"\n`,
      );
    } else {
      yamlWithComment = `${currentYaml}\ncomment: "${comment}"`;
    }

    await this.editNodeYamlContent(yamlWithComment);

    // 4. Toggle back to form view to trigger save and then close
    await this.toggleNodeYamlEditor();
    await this.collapseSideContent();
  }

  async expectSidebarCommentValue(comment: string) {
    await expect(this.page.getByTestId('sidebar-node-comment')).toHaveText(
      comment,
    );
  }

  async expectSidebarCommentAbsent() {
    await expect(this.page.getByTestId('sidebar-node-comment')).toContainText(
      'No comment',
    );
  }

  // --- Side Drawer YAML Editor Helpers ---

  async toggleNodeYamlEditor() {
    await this.expandSideContent();
    await this.page.getByTestId('yaml-toggle-switch').click();
  }

  async getNodeYamlContent() {
    // Rely on the side drawer code mirror taking focus
    const editor = this.page.locator('.cm-content').last();
    await expect(editor).toBeVisible();
    return await editor.innerText();
  }

  async editNodeYamlContent(newContent: string) {
    const editor = this.page.locator('.cm-content').last();
    await expect(editor).toBeVisible();
    await editor.click();

    // Select all text
    await this.page.keyboard.press('ControlOrMeta+a');

    // Delete existing content
    await this.page.keyboard.press('Backspace');

    // Type new content
    await editor.fill(newContent);
  }
}
