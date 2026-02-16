import {
  resolvePackagePath,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import { Knex } from 'knex';
import { PrefabStore } from './types';
import {
  AllNodeData,
  Prefab,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { v4 as uuid } from 'uuid';
import { RawDatabasePrefab } from './types';
import type { Node } from '@xyflow/react';

const migrationsDir = resolvePackagePath(
  '@kissmiklosjr/plugin-scaffolder-studio-backend',
  'migrations',
);

export class DatabasePrefabStore implements PrefabStore {
  static async create(options: {
    database: DatabaseService;
  }): Promise<DatabasePrefabStore> {
    const { database } = options;
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DatabasePrefabStore(client);
  }

  private constructor(private readonly db: Knex) {}

  private deserialize(row: RawDatabasePrefab): Prefab {
    return {
      ...row,
      node: JSON.parse(row.node),
    };
  }

  async cleanup(): Promise<void> {
    await this.db.destroy();
  }

  async get({ id }: { id: string }): Promise<Prefab> {
    const row = await this.db('prefabs')
      .where({ id })
      .andWhere({ deleted: false })
      .first();

    if (!row) {
      throw new NotFoundError(`Prefab with id ${id} not found`);
    }

    return this.deserialize(row);
  }

  async list(): Promise<Prefab[]> {
    const rows = await this.db('prefabs').select('*').where({ deleted: false });
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
    await this.db('prefabs')
      .update({ node: JSON.stringify(node), title, description })
      .where({ id });
  }
  async create({
    node,
    owner,
  }: {
    node: Node<AllNodeData>;
    owner: string;
  }): Promise<{ id: string }> {
    const id = uuid();
    await this.db('prefabs').insert({ node: JSON.stringify(node), owner, id });
    return { id };
  }
  async delete({ id }: { id: string }): Promise<void> {
    await this.db('prefabs').update({ deleted: true }).where({ id });
  }
}
