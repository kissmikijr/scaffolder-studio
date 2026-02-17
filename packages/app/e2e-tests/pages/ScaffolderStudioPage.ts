import { Page, expect } from '@playwright/test';

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
    await expect(
      this.page.locator('.react-flow__node').filter({ hasText: text }).first(),
    ).toBeVisible();
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
    await this.page
      .locator('.react-flow__node')
      .filter({ hasText: text })
      .first()
      .click({ force: true });
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
    await this.page.getByRole('tab', { name: 'Yaml' }).click();
  }
  async goToPrefabsTab() {
    await this.page.getByRole('tab', { name: 'Prefabs' }).click();
  }
  async verifyPrefabVisible(title: string, sectionTitle?: string) {
    if (sectionTitle) {
      const section = this.page.locator('tr').filter({ hasText: sectionTitle.toUpperCase() });
      await expect(section).toBeVisible({ timeout: 15000 });
    }
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 15000 });
  }

  async getYamlContent() {
    const editor = this.page.locator('.cm-content');
    await expect(editor).toBeVisible();
    return await editor.innerText();
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

    const sourceNode = this.page
      .locator('.react-flow__node')
      .filter({ hasText: sourceNodeText })
      .first();
    const targetNode = this.page
      .locator('.react-flow__node')
      .filter({ hasText: targetNodeText })
      .first();
    await expect(sourceNode).toBeVisible();
    await expect(targetNode).toBeVisible();

    await this.panNodeToViewportCenter(sourceNode);
    await this.panNodeToViewportCenter(targetNode);

    const sourceHandle = sourceNode.locator(
      `.react-flow__handle.source[data-handleid="${sourceHandleId}"]`,
    );
    const targetHandle = targetNode.locator(
      `.react-flow__handle.target[data-handleid="${targetHandleId}"]`,
    );

    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error('Handle bounding box not found');
    }

    const sourceX = sourceBox.x + sourceBox.width / 2;
    const sourceY = sourceBox.y + sourceBox.height / 2;
    const targetX = targetBox.x + targetBox.width / 2;
    const targetY = targetBox.y + targetBox.height / 2;

    // Drop close to the target so React Flow auto-snaps the connection.
    // This avoids brittle "pixel-perfect on top of handle" dragging.
    const deltaX = targetX - sourceX;
    const deltaY = targetY - sourceY;
    const distance = Math.hypot(deltaX, deltaY);
    const snapProximityPx = 14;
    const releaseX =
      distance > snapProximityPx
        ? targetX - (deltaX / distance) * snapProximityPx
        : targetX;
    const releaseY =
      distance > snapProximityPx
        ? targetY - (deltaY / distance) * snapProximityPx
        : targetY;

    await this.page.mouse.move(sourceX, sourceY);
    await this.page.mouse.down();
    await this.page.mouse.move(releaseX, releaseY, { steps: 24 });
    await this.page.waitForTimeout(40);
    await this.page.mouse.up();

    await expect(async () => {
      const edgeCount = await this.page.locator('.react-flow__edge').count();
      expect(edgeCount).toBeGreaterThan(initialEdgeCount);
    }).toPass({ timeout: 10000 });
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

    // Fill RJSF form values
    for (const [key, value] of Object.entries(formValues)) {
      const inputLabel = new RegExp(`^${key}`, 'i');
      const input = this.page.getByLabel(inputLabel).first();

      if (await input.isVisible()) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'input' || tagName === 'textarea') {
          await input.fill(value.toString());
        } else if (tagName === 'select') {
          await input.selectOption(value.toString());
        }
      } else {
        const byPlaceholder = this.page.getByPlaceholder(key);
        if (await byPlaceholder.isVisible()) {
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
        const urlField = newLinkBox.locator('div', { hasText: /^URL$/ }).first();
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
      (el, { deltaX, deltaY }) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX,
            deltaY,
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
}
