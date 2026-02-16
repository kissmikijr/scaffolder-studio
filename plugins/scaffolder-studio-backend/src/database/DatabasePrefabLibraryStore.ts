import {
  resolvePackagePath,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import { PrefabLibraryStore } from './types';
import {
  AllNodeData,
  Prefab,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { RawDatabasePrefabLibrary } from './types';
import type { Node } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

const migrationsDir = resolvePackagePath(
  '@kissmiklosjr/plugin-scaffolder-studio-backend',
  'migrations',
);

export class DatabasePrefabLibraryStore implements PrefabLibraryStore {
  static async create(options: {
    database: DatabaseService;
  }): Promise<DatabasePrefabLibraryStore> {
    const { database } = options;
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DatabasePrefabLibraryStore(client);
  }

  private constructor(private readonly db: Knex) {}

  private deserialize(row: RawDatabasePrefabLibrary): Prefab {
    return {
      ...row,
      id: row.id,
      prefabId: row.prefab_id,
      node: JSON.parse(row.node),
    };
  }

  async cleanup(): Promise<void> {
    await this.db.destroy();
  }

  async get({ id, version }: { id: string; version?: string }): Promise<Prefab> {
    let query = this.db('prefab_library')
      .where('prefab_library.prefab_id', id);
    
    if (version) {
      query = query.where('prefab_library.version', version);
    } else {
      query = query.orderBy('created_at', 'desc');
    }
    
    const row = await query.first();
    if (!row) {
      const versionMsg = version ? ` version ${version}` : '';
      throw new Error(`Prefab with id ${id}${versionMsg} not found in library`);
    }
    return this.deserialize(row);
  }

  async list(): Promise<Prefab[]> {
    const rows = await this.db('prefab_library');
    if (!rows) {
      return [];
    }
    return rows.map(row => this.deserialize(row));
  }
  async update({
    id,
    node,
    title,
    description,
  }: {
    id: string;
    node: Node<AllNodeData>;
    title: string;
    description: string;
  }): Promise<void> {
    await this.db('prefab_library')
      .update({ node: JSON.stringify(node), title, description })
      .where({ id });
  }
  async create({
    prefabId,
    owner,
  }: {
    prefabId: string;
    owner: string;
  }): Promise<{ id: string }> {
    const prefab = await this.db('prefabs')
      .where('id', prefabId)
      .andWhere('deleted', false)
      .first();

    if (!prefab) {
      throw new Error(`Prefab with id ${prefabId} not found`);
    }

    const latestLibraryEntry = await this.db('prefab_library')
      .where('prefab_id', prefabId)
      .orderBy('created_at', 'desc')
      .first();

    let version = '1';
    if (latestLibraryEntry && latestLibraryEntry.version) {
      const currentVersion = parseInt(latestLibraryEntry.version, 10);
      if (!isNaN(currentVersion)) {
        version = (currentVersion + 1).toString();
      }
    }

    const id = uuidv4();
    await this.db('prefab_library').insert({
      id,
      prefab_id: prefabId,
      node: prefab.node, // Already a string in the database
      title: prefab.title,
      description: prefab.description,
      owner,
      version,
    });
    return { id };
  }
  async delete({ id }: { id: string }): Promise<void> {
    await this.db('prefab_library').delete().where({ id });
  }
}
