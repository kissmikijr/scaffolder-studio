import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import { VisualTemplateProject } from '../components/Studio/types';
import {
  PublishedTemplate,
  ScaffolderAction,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Edge, Node } from '@xyflow/react';

export interface ScaffolderStudioApi {
  getProject(id: string): Promise<VisualTemplateProject>;
  importTemplate({
    template,
    id,
  }: {
    template: Record<string, unknown>;
    id: string;
  }): Promise<void>;
  listProjects(options: {
    trashed?: boolean;
  }): Promise<VisualTemplateProject[]>;
  listPublishedProjects(): Promise<PublishedTemplate[]>;
  create(project: VisualTemplateProject): Promise<void>;
  update(project: VisualTemplateProject): Promise<void>;
  listActions(): Promise<ScaffolderAction[]>;
  trashProject(ids: string[]): Promise<void>;
  deleteProjects(ids: string[]): Promise<void>;
  restoreProjects(ids: string[]): Promise<void>;
  unpublish({
    visualTemplateId,
    scaffolderTemplate,
  }: {
    visualTemplateId: string;
    scaffolderTemplate: string;
  }): Promise<void>;
  publish({
    visualTemplateId,
    scaffolderTemplate,
    publisherId,
    options,
  }: {
    visualTemplateId: string;
    scaffolderTemplate: string;
    publisherId?: string;
    options?: Record<string, unknown>;
  }): Promise<void>;
  listPublishers(): Promise<{ id: string; title: string }[]>;
  sendChatMessage(message: string): Promise<{ content: string }>;
  serializeTemplate({
    nodes,
    edges,
    sourceNodeId,
  }: {
    nodes: Node[];
    edges: Edge[];
    sourceNodeId: string;
  }): Promise<string>;
  resolve({ nodes }: { nodes: Node[] }): Promise<Node[]>;
  getDryRunInputs(templateId: string): Promise<Record<string, unknown>>;
  saveDryRunInputs(
    templateId: string,
    inputs: Record<string, unknown>,
  ): Promise<void>;
}

export const scaffolderVisualApiRef = createApiRef<ScaffolderStudioApi>({
  id: 'plugin.scaffolder-studio.api',
});

export class ScaffolderVisualClient implements ScaffolderStudioApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) { }

  private async getBaseUrl(): Promise<string> {
    return this.discoveryApi.getBaseUrl('scaffolder-studio');
  }

  async getProject(id: string) {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/${id}`,
    );
    if (!res.ok) throw new Error(`Failed to load project ${id}`);
    return await res.json();
  }

  async importTemplate({
    template,
    id,
  }: {
    template: Record<string, unknown>;
    id: string;
  }) {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, id }),
      },
    );
    if (!res.ok) throw new Error('Failed to import template');
  }

  async create(project: VisualTemplateProject): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      },
    );
    if (!res.ok) throw new Error('Failed to create project');
  }

  async update(project: VisualTemplateProject): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/${project.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      },
    );
    if (!res.ok) throw new Error('Failed to update project');
  }

  async listProjects(options: { trashed?: boolean; published?: boolean } = {}) {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates?trashed=${options.trashed ?? false
      }`,
    );
    if (!res.ok) throw new Error('Failed to list projects');
    return await res.json();
  }
  async listPublishedProjects(): Promise<PublishedTemplate[]> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/published`,
    );
    if (!res.ok) throw new Error('Failed to list published projects');
    return await res.json();
  }

  async trashProject(ids: string[]): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/trash`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
    );
    if (!res.ok) throw new Error('Failed to trash projects');
  }

  async restoreProjects(ids: string[]): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/restore`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
    );
    if (!res.ok) throw new Error('Failed to restore project');
  }

  async deleteProjects(ids: string[]): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/delete/hard`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
    );
    if (!res.ok) throw new Error('Failed to delete projects');
  }

  async listActions() {
    const res = await this.fetchApi.fetch(`${await this.getBaseUrl()}/actions`);
    if (!res.ok) throw new Error('Failed to list actions');
    return await res.json();
  }

  async publish({
    visualTemplateId,
    scaffolderTemplate,
    publisherId,
    options,
  }: {
    visualTemplateId: string;
    scaffolderTemplate: string;
    publisherId?: string;
    options?: Record<string, unknown>;
  }): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/${visualTemplateId}/publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scaffolderTemplate, publisherId, options }),
      },
    );
    if (!res.ok) throw new Error('Failed to publish project');
  }

  async listPublishers(): Promise<{ id: string; title: string }[]> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/publishers`,
    );
    if (!res.ok) throw new Error('Failed to list publishers');
    return await res.json();
  }
  async unpublish({
    visualTemplateId,
    scaffolderTemplate,
  }: {
    visualTemplateId: string;
    scaffolderTemplate: string;
  }): Promise<void> {
    try {
      const res = await this.fetchApi.fetch(
        `${await this.getBaseUrl()}/templates/${visualTemplateId}/unpublish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scaffolderTemplate }),
        },
      );
      if (!res.ok) throw new Error('Failed to unpublish project');
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to unpublish project, ${error}`);
    }
  }

  async sendChatMessage(message: string): Promise<{ content: string }> {
    const res = await this.fetchApi.fetch(
      `${await this.discoveryApi.getBaseUrl(
        'scaffolder-studio-agent',
      )}/chat/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      },
    );
    if (!res.ok) throw new Error('Failed to send chat message');
    return await res.json();
  }

  async serializeTemplate({
    nodes,
    edges,
    sourceNodeId,
  }: {
    nodes: Node[];
    edges: Edge[];
    sourceNodeId: string;
  }): Promise<string> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/template/serialize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, sourceNodeId }),
      },
    );

    const body = await res.json();
    if (!res.ok) throw new Error('Failed to serialize template');
    return body;
  }
  async resolve({ nodes }: { nodes: Node[] }) {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefabs/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      },
    );
    if (!res.ok) throw new Error('Failed to resolve nodes');
    return await res.json();
  }

  async getDryRunInputs(templateId: string): Promise<Record<string, unknown>> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/${templateId}/dry-run-inputs`,
    );
    if (!res.ok) throw new Error('Failed to get dry run inputs');
    return await res.json();
  }

  async saveDryRunInputs(
    templateId: string,
    inputs: Record<string, unknown>,
  ): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/templates/${templateId}/dry-run-inputs`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      },
    );
    if (!res.ok) throw new Error('Failed to save dry run inputs');
  }
}
