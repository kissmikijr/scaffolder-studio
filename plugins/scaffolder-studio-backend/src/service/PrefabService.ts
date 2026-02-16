import { PrefabStore } from '../database/types';
import type { Node } from '@xyflow/react';

export class PrefabService {
  private readonly prefabStore: PrefabStore;

  constructor({ prefabStore }: { prefabStore: PrefabStore }) {
    this.prefabStore = prefabStore;
  }

  get stores() {
    return {
      prefabStore: this.prefabStore,
    };
  }

  async cleanup(): Promise<void> {
    // Clean up database connections
    if (this.prefabStore && 'cleanup' in this.prefabStore) {
      await (this.prefabStore as any).cleanup();
    }
  }

  async get(id: string) {
    return await this.prefabStore.get({ id });
  }
  async list() {
    return await this.prefabStore.list();
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
  }) {
    return await this.prefabStore.update({ id, node, title, description });
  }
  async create({ node, owner }: { node: Node; owner: string }) {
    return await this.prefabStore.create({ node, owner });
  }
  async delete(id: string) {
    return await this.prefabStore.delete({ id });
  }
}
