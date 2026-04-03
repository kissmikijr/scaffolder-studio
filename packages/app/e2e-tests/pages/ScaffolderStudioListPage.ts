import { Page, expect } from '@playwright/test';
import { ensureGuestLogin } from '../utils/auth';
import {
  getGuestAuthToken,
  requestScaffolderStudioApi,
} from '../utils/backendApi';

export class ScaffolderStudioListPage {
  private readonly page: Page;
  private readonly createdTemplateIds: string[] = [];
  private authToken?: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/scaffolder-studio/templates');

    const newButton = this.page
      .getByRole('button')
      .filter({ hasText: /new/i })
      .first();
    await ensureGuestLogin(this.page, newButton);
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

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    this.authToken = await getGuestAuthToken(this.page);
    return this.authToken;
  }

  private async postTemplatesApi(
    endpoint: string,
    data: unknown,
  ): Promise<{ ok: boolean; status: number; body: string }> {
    const token = await this.getAuthToken();
    const { response } = await requestScaffolderStudioApi(this.page, {
      method: 'post',
      path: endpoint,
      data,
      token,
    });
    const body = await response.text();

    return { ok: response.ok(), status: response.status(), body };
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
