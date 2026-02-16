import { Page, expect } from '@playwright/test';

export class ScaffolderVisualEditorListPage {
  private readonly page: Page;
  private readonly createdTemplateIds: string[] = [];
  private authToken?: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/scaffolder-studio/templates');

    // Handle potential redirect to login page
    const enterButton = this.page.getByRole('button', { name: 'Enter' });
    if (await enterButton.isVisible()) {
      await enterButton.click({ force: true });
    }
  }

  async createNewTemplate(): Promise<string> {
    await this.page
      .getByRole('button')
      .filter({ hasText: /new/i })
      .first()
      .click();
    await this.page.waitForURL(
      /\/scaffolder-studio\/templates\/[^/]+\/(form|yaml|ai|prefabs|dry-run)/,
    );
    const idMatch = this.page.url().match(/templates\/([^/]+)\//);
    if (!idMatch) {
      throw new Error('Failed to extract template id from URL');
    }
    const templateId = idMatch[1];
    this.createdTemplateIds.push(templateId);
    return templateId;
  }

  async expectTemplateToBeVisible(templateName: string) {
    await expect(this.page.getByText(templateName)).toBeVisible();
  }

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
        // Not JSON/token response, continue.
      }
    }

    throw new Error('Failed to get backend auth token');
  }

  private async postTemplatesApi(
    endpoint: string,
    data: unknown,
  ): Promise<{ ok: boolean; status: number; body: string }> {
    const baseCandidates = this.getBackendBaseCandidates();
    const token = await this.getAuthToken();

    let lastResponse: { ok: boolean; status: number; body: string } | undefined;
    for (const base of baseCandidates) {
      const res = await this.page.request.post(
        `${base}/api/scaffolder-studio${endpoint}`,
        {
          data,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const body = await res.text();
      const result = { ok: res.ok(), status: res.status(), body };
      lastResponse = result;

      // Keep first non-404 response.
      if (res.status() !== 404) {
        return result;
      }
    }

    return (
      lastResponse ?? {
        ok: false,
        status: 0,
        body: 'No response',
      }
    );
  }

  async deleteTemplateById(id: string) {
    const trashRes = await this.postTemplatesApi('/templates/trash', {
      ids: [id],
    });
    if (!trashRes.ok) {
      throw new Error(
        `Failed to trash template ${id}: ${trashRes.status} ${trashRes.body}`,
      );
    }

    // Hard delete is optional; it can fail due permissions in some environments.
    await this.postTemplatesApi('/templates/delete/hard', { ids: [id] });
  }

  async cleanupCreatedTemplates() {
    const idFromUrl = this.page.url().match(/templates\/([^/]+)\//)?.[1];
    if (idFromUrl) {
      this.createdTemplateIds.push(idFromUrl);
    }

    if (this.createdTemplateIds.length === 0) {
      return;
    }

    const uniqueIds = [...new Set(this.createdTemplateIds)];
    for (const id of uniqueIds) {
      let deleted = false;
      let lastError: unknown;
      for (let attempt = 0; attempt < 3 && !deleted; attempt++) {
        try {
          await this.deleteTemplateById(id);
          deleted = true;
        } catch (error) {
          lastError = error;
          await this.page.waitForTimeout(500);
        }
      }
      if (!deleted) {
        throw new Error(
          `Cleanup failed for template ${id}: ${String(lastError)}`,
        );
      }
    }
    this.createdTemplateIds.length = 0;
  }
}
