import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { Prefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export const prefabLibraryApiRef = createApiRef<PrefabLibraryClientApi>({
  id: 'plugin.scaffolder-studio.prefab-library',
});

export interface PrefabLibraryClientApi {
  listLibrary(): Promise<Prefab[]>;
  create(
    node: any,
    title: string,
    description: string,
    version: string,
  ): Promise<Prefab>;
  delete(id: string): Promise<void>;
  get(id: string, version?: string): Promise<Prefab>;
}

export class PrefabLibraryClient implements PrefabLibraryClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async getBaseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('scaffolder-studio');
  }
  async get(id: string, version?: string): Promise<Prefab> {
    const baseUrl = await this.getBaseUrl();
    const url = version 
      ? `${baseUrl}/prefab-library/${id}?version=${encodeURIComponent(version)}`
      : `${baseUrl}/prefab-library/${id}`;
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get prefab: ${response.statusText}`);
    }

    return await response.json();
  }

  async listLibrary(): Promise<Prefab[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/prefab-library/all`);

    if (!response.ok) {
      throw new Error(`Failed to list prefabs: ${response.statusText}`);
    }

    return await response.json();
  }

  async create(
    node: any,
    title: string,
    description: string,
    version: string,
  ): Promise<Prefab> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/prefab-library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ node, title, description, version }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create prefab: ${response.statusText}`);
    }

    return await response.json();
  }

  async delete(id: string): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/prefab-library/${id}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete prefab: ${response.statusText}`);
    }
  }
}
