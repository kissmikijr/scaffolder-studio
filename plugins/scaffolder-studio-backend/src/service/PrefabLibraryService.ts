import { PrefabLibraryStore } from '../database/types';

export class PrefabLibraryService {
  private readonly prefabLibraryStore: PrefabLibraryStore;

  constructor({ prefabLibraryStore }: { prefabLibraryStore: PrefabLibraryStore }) {
    this.prefabLibraryStore = prefabLibraryStore;
  }

  get stores() {
    return {
      prefabLibraryStore: this.prefabLibraryStore,
    };
  }

  async cleanup(): Promise<void> {
    // Clean up database connections
    if (this.prefabLibraryStore && 'cleanup' in this.prefabLibraryStore) {
      await (this.prefabLibraryStore as any).cleanup();
    }
  }

  async get(prefabId: string, version?: string) {
    return await this.prefabLibraryStore.get({ id: prefabId, version });
  }
  async list() {
    return await this.prefabLibraryStore.list();
  }

  async create({ prefabId, owner }: { prefabId: string; owner: string }) {
    return await this.prefabLibraryStore.create({ prefabId, owner });
  }
  async delete({ id }: { id: string }) {
    return await this.prefabLibraryStore.delete({ id });
  }
}
