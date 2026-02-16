import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import { StoredPrefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Node } from '@xyflow/react';

export interface PrefabsClientApi {
  list(): Promise<StoredPrefab[]>;
  get({ id }: { id: string }): Promise<StoredPrefab>;
  create({
    node,
    owner,
    title,
    description,
  }: {
    node: Node;
    owner?: string;
    title: string;
    description?: string;
  }): Promise<{ id: string }>;
  update({
    id,
    node,
    title,
    description,
  }: {
    id: string;
    node: Node;
    title: string;
    description: string;
  }): Promise<void>;
  delete({ id }: { id: string }): Promise<void>;
  addToLibrary({
    prefabId,
    owner,
  }: {
    prefabId: string;
    owner?: string;
  }): Promise<{ id: string }>;
  listLibrary(): Promise<StoredPrefab[]>;
}

export const prefabsApiRef = createApiRef<PrefabsClientApi>({
  id: 'plugin.scaffolder-studio.prefabs.api',
});

export class PrefabsClient implements PrefabsClientApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) { }

  private async getBaseUrl(): Promise<string> {
    return this.discoveryApi.getBaseUrl('scaffolder-studio');
  }

  async list(): Promise<StoredPrefab[]> {
    const res = await this.fetchApi.fetch(`${await this.getBaseUrl()}/prefabs`);
    if (!res.ok) throw new Error('Failed to list prefabs');
    return await res.json();
  }

  async get({ id }: { id: string }): Promise<StoredPrefab> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefabs/${id}`,
    );
    if (!res.ok) throw new Error('Failed to get prefab');
    return await res.json();
  }

  async create({
    node,
    owner,
    title,
    description,
  }: {
    node: Node;
    owner?: string;
    title: string;
    description?: string;
  }): Promise<{ id: string }> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefabs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, owner, title, description }),
      },
    );
    if (!res.ok) throw new Error('Failed to create prefab');
    return await res.json();
  }

  async update({
    id,
    node,
    title,
    description,
  }: {
    id: string;
    node: Node;
    title: string;
    description: string;
  }): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefabs/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, title, description }),
      },
    );
    if (!res.ok) throw new Error('Failed to update prefab');
  }

  async delete({ id }: { id: string }): Promise<void> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefabs/${id}`,
      {
        method: 'DELETE',
      },
    );
    if (!res.ok) throw new Error('Failed to delete prefab');
  }

  async addToLibrary({
    prefabId,
    owner,
  }: {
    prefabId: string;
    owner?: string;
  }): Promise<{ id: string }> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefab-library`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefabId, owner }),
      },
    );
    if (!res.ok) throw new Error('Failed to add prefab to library');
    return await res.json();
  }

  async listLibrary(): Promise<StoredPrefab[]> {
    const res = await this.fetchApi.fetch(
      `${await this.getBaseUrl()}/prefab-library/all`,
    );
    if (!res.ok) throw new Error('Failed to list library prefabs');
    return await res.json();
  }
}
