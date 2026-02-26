import { Page, expect, Locator } from '@playwright/test';

export class TemplateListPage {
  constructor(private readonly page: Page) { }
  private authToken?: string;

  private getBackendBaseCandidates(): string[] {
    const configuredBase = process.env.PLAYWRIGHT_URL?.replace(/\/$/, '');
    const candidates = [configuredBase, 'http://localhost:7007'].filter(
      Boolean,
    ) as string[];
    return [...new Set(candidates)];
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }
    for (const base of this.getBackendBaseCandidates()) {
      const res = await this.page.request.get(`${base}/api/auth/guest/refresh`);
      if (!res.ok()) {
        continue;
      }
      try {
        const body = await res.json();
        const token = body?.backstageIdentity?.token as string | undefined;
        if (token) {
          this.authToken = token;
          return token;
        }
      } catch {
        // ignore, continue
      }
    }
    throw new Error('Failed to get backend auth token');
  }

  private async putTemplatesApi(path: string, data: unknown) {
    const token = await this.getAuthToken();
    for (const base of this.getBackendBaseCandidates()) {
      const res = await this.page.request.put(
        `${base}/api/scaffolder-studio${path}`,
        {
          data,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status() !== 404) {
        if (!res.ok()) {
          throw new Error(
            `PUT ${base}/api/scaffolder-studio${path} failed: ${res.status()} ${await res.text()}`,
          );
        }
        return;
      }
    }
    throw new Error(`PUT templates API route not found for ${path}`);
  }

  private async postTemplatesApi(path: string, data: unknown) {
    const token = await this.getAuthToken();
    for (const base of this.getBackendBaseCandidates()) {
      const res = await this.page.request.post(
        `${base}/api/scaffolder-studio${path}`,
        {
          data,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status() !== 404) {
        if (!res.ok()) {
          throw new Error(
            `POST ${base}/api/scaffolder-studio${path} failed: ${res.status()} ${await res.text()}`,
          );
        }
        return;
      }
    }
    throw new Error(`POST templates API route not found for ${path}`);
  }

  async goto() {
    await this.page.goto('/scaffolder-studio/templates');
  }

  async gotoTrash() {
    await this.page.goto('/scaffolder-studio/trash');
  }

  async clickTrashTab() {
    const tab = this.page.getByRole('tab').filter({ hasText: /trash/i });
    await tab.click();
  }

  async clickTemplatesTab() {
    const tab = this.page.getByRole('tab').filter({ hasText: /^templates$/i });
    await tab.click();
  }

  async createNewTemplate() {
    // Find the "New" button using data-testid
    const newButton = this.page.getByTestId('new-project-button');
    await newButton.click();
    // Wait for navigation to the new template editor
    await this.page.waitForURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
    );
  }

  async getTemplateCards(): Promise<Locator> {
    return this.page.locator('[data-testid="template-card"]');
  }

  async getTemplateCardByName(name: string): Promise<Locator> {
    const cards = await this.getTemplateCards();
    return cards.filter({ hasText: name });
  }

  async selectTemplate(name: string) {
    const card = await this.getTemplateCardByName(name);
    await card.first().click();
  }

  async rightClickTemplate(name: string) {
    const card = await this.getTemplateCardByName(name);
    await card.first().click({ button: 'right' });
  }

  async rightClickFirstTemplate() {
    const cards = await this.getTemplateCards();
    // Click to select first, then right-click
    await cards.first().click();
    await cards.first().click({ button: 'right' });
  }

  async clickContextMenuItem(text: string) {
    const menuItem = this.page
      .getByRole('menuitem')
      .filter({ hasText: new RegExp(text, 'i') });
    await menuItem.click();
  }

  async confirmDialog() {
    // Look for the confirmation button in the dialog
    const confirmButton = this.page
      .getByRole('button')
      .filter({ hasText: /trash|delete/i })
      .last();
    await confirmButton.click();
  }

  async cancelDialog() {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  async waitForToast(message: string) {
    await expect(this.page.getByText(new RegExp(message, 'i'))).toBeVisible({
      timeout: 5000,
    });
  }

  async getTemplateCount(): Promise<number> {
    // Wait for network activity to settle (templates loading from API)
    await this.page.waitForLoadState('networkidle');
    // Wait a bit for React to render the components
    await this.page.waitForTimeout(500);
    const cards = await this.getTemplateCards();
    return await cards.count();
  }

  async templateExists(name: string): Promise<boolean> {
    const card = await this.getTemplateCardByName(name);
    return (await card.count()) > 0;
  }

  async selectSortOption(option: 'name' | 'updated') {
    // Find and click the FormControl > Select dropdown
    const select = this.page.locator('div[role="combobox"]').first();
    await select.click();
    // Click the menu item
    const menuItem = this.page.getByRole('option', {
      name: option === 'name' ? 'Name' : 'Last Modified',
    });
    await menuItem.click();
    // Wait for re-render
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async searchForTemplate(name: string) {
    const searchInput = this.page.getByPlaceholder('Search');
    await searchInput.fill(name);
    // Wait for re-render (filtering happens client-side)
    await this.page.waitForTimeout(500);
  }

  async getTemplateNames(): Promise<string[]> {
    const cards = await this.getTemplateCards();
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // The name is the first Typography in the card content (after the thumbnail)
      // Just get the first p tag which contains the name with fontWeight 500
      const nameElement = card.locator('p').first();
      const name = await nameElement.textContent({ timeout: 5000 });
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  async createTemplateViaUI(name: string): Promise<string> {
    // Navigate to templates page
    await this.goto();

    // Find templates count before creation
    const initialCount = await this.getTemplateCount();

    // Click the "New" button
    const newButton = this.page.getByTestId('new-project-button');
    await newButton.click({ force: true });

    // Wait for navigation to editor
    await this.page.waitForURL(
      /\/scaffolder-studio\/templates\/.*\/(form|node)/,
    );

    // Extract the template ID from URL
    const url = this.page.url();
    const match = url.match(/templates\/(.*)\/(?:form|node)/);
    if (!match) throw new Error('Could not extract template ID from URL');
    const id = match[1];

    // Update the template name via API
    await this.putTemplatesApi(`/templates/${id}`, {
      id,
      metadata: { name },
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      owner: 'test',
      deleted: false,
      updated: new Date().toISOString(),
      published_at: null,
    });

    return id;
  }

  async createTemplateViaApi(name: string): Promise<string> {
    const id = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.postTemplatesApi('/templates', {
      id,
      metadata: { name },
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      owner: 'test',
      deleted: false,
      updated: new Date().toISOString(),
      published_at: null,
    });
    return id;
  }

  async createTemplateWithDescriptionViaApi(
    name: string,
    description: string,
  ): Promise<string> {
    const id = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.postTemplatesApi('/templates', {
      id,
      metadata: { name, description },
      nodes: [
        {
          id: `${id}-template`,
          type: 'template',
          position: { x: 100, y: 100 },
          data: {
            nodeType: 'template',
            name,
            description,
            owner: '',
            annotations: {},
            spec: { type: 'component' },
          },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      owner: 'test',
      deleted: false,
      updated: new Date().toISOString(),
      published_at: null,
    });
    return id;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.postTemplatesApi('/templates/trash', { ids: [id] });
    // Hard delete may be permission-gated in some runs.
    try {
      await this.postTemplatesApi('/templates/delete/hard', { ids: [id] });
    } catch {
      // ignore hard-delete failures; trash is sufficient for cleanup
    }
  }

  async clickImportTemplateButton() {
    // Make sure we're on the templates page
    await this.goto();
    // Find button by text content
    const importButton = this.page
      .getByRole('button')
      .filter({ hasText: 'Import Template' });
    await importButton.waitFor({ state: 'visible', timeout: 5000 });
    await importButton.click();
  }

  async fillImportDialog(yamlContent: string) {
    // Wait for dialog to appear
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });

    // Wait for CodeEditor to load
    await this.page.waitForTimeout(500);

    // Find the textbox (CodeMirror's contenteditable div)
    const textbox = this.page.getByRole('textbox').locator('div').first();
    await textbox.click();

    // Use insertText which should work fine for single-line content
    await this.page.keyboard.insertText(yamlContent);

    // Wait for React to update state
    await this.page.waitForTimeout(1000);
  }

  async submitImportDialog() {
    const importButton = this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Import' });
    await importButton.click();
  }

  async cancelImportDialog() {
    const cancelButton = this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cancel' });
    await cancelButton.click();
  }

  async waitForTemplateVisible(name: string) {
    const card = await this.getTemplateCardByName(name);
    await expect(card.first()).toBeVisible({ timeout: 15000 });
  }
}
