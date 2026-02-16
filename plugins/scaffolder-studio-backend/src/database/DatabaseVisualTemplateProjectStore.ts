import {
  resolvePackagePath,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import { Knex } from 'knex';
import { RawDatabaseVisualTemplateRow } from './types';
import {
  VisualTemplateProject,
  VisualTemplateProjectStore,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

const migrationsDir = resolvePackagePath(
  '@kissmiklosjr/plugin-scaffolder-studio-backend',
  'migrations',
);

export class DatabaseVisualTemplateProjectStore
  implements VisualTemplateProjectStore {
  static async create(options: {
    database: DatabaseService;
  }): Promise<DatabaseVisualTemplateProjectStore> {
    const { database } = options;
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DatabaseVisualTemplateProjectStore(client);
  }

  private constructor(private readonly db: Knex) { }

  async cleanup(): Promise<void> {
    await this.db.destroy();
  }

  async get(id: string): Promise<VisualTemplateProject> {
    const row = await this.db<RawDatabaseVisualTemplateRow>('visual_templates')
      .where({ id })
      .first();

    if (!row) {
      throw new NotFoundError(`Project with id ${id} not found`);
    }

    return this.deserialize(row);
  }

  async list(options?: {
    trashed?: boolean;
    owner?: string;
  }): Promise<VisualTemplateProject[]> {
    const query = this.db<RawDatabaseVisualTemplateRow>(
      'visual_templates as vt',
    )
      .leftJoin(
        this.db('published_templates as pt')
          .select('visual_template_id', 'published_at', 'version')
          .whereRaw(
            'pt.version = (SELECT MAX(version) FROM published_templates pt2 WHERE pt2.visual_template_id = pt.visual_template_id AND pt2.unpublished = false)',
          )
          .andWhere('unpublished', false)
          .as('latest_published'),
        'vt.id',
        'latest_published.visual_template_id',
      )
      .where('vt.owner', options?.owner)
      .select(
        'vt.*',
        'latest_published.published_at',
        'latest_published.version as published_version',
      );

    if (options?.trashed) {
      query.where('vt.deleted', true);
    } else {
      query.where('vt.deleted', false);
    }

    const rows = await query;
    return rows.map(row => this.deserializeWithPublication(row));
  }

  async set(data: Omit<VisualTemplateProject, 'deleted'>): Promise<void> {
    const row = this.serialize(data);

    // Get the previous version to check for removed prefabs
    let previousNodes: any[] = [];
    try {
      const existingProject = await this.get(data.id);
      previousNodes = existingProject.nodes;
    } catch (error) {
      // Project doesn't exist yet, no previous nodes to compare
    }

    // Extract prefab node IDs from current and previous versions
    const currentPrefabIds = this.extractPrefabIds(data.nodes);
    const previousPrefabIds = this.extractPrefabIds(previousNodes);

    // Find removed prefabs
    const removedPrefabIds = previousPrefabIds.filter(
      id => !currentPrefabIds.includes(id),
    );

    // Find new prefabs
    const newPrefabIds = currentPrefabIds.filter(
      id => !previousPrefabIds.includes(id),
    );

    // Use transaction to ensure consistency
    await this.db.transaction(async trx => {
      // Update the visual template
      await trx<RawDatabaseVisualTemplateRow>('visual_templates')
        .insert(row)
        .onConflict('id')
        .merge(['metadata', 'nodes', 'edges', 'updated', 'viewport']);

      // Remove connections for removed prefabs
      if (removedPrefabIds.length > 0) {
        await trx('prefabs_templates_connections')
          .where('template_id', data.id)
          .whereIn('prefab_id', removedPrefabIds)
          .delete();
      }

      // Add connections for new prefabs
      if (newPrefabIds.length > 0) {
        const connections = newPrefabIds.map(prefabId => ({
          id: this.generateConnectionId(prefabId, data.id),
          prefab_id: prefabId,
          template_id: data.id,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        await trx('prefabs_templates_connections')
          .insert(connections)
          .onConflict('id')
          .ignore(); // Ignore if connection already exists
      }
    });
  }

  async hardDelete(ids: string[]): Promise<void> {
    await this.db.transaction(async trx => {
      // Delete prefab connections first
      await trx('prefabs_templates_connections')
        .whereIn('template_id', ids)
        .delete();

      // Then delete the templates
      await trx<RawDatabaseVisualTemplateRow>('visual_templates')
        .whereIn('id', ids)
        .delete();
    });
  }

  async delete(ids: string[]): Promise<void> {
    await this.db<RawDatabaseVisualTemplateRow>('visual_templates')
      .whereIn('id', ids)
      .update({ deleted: true });
  }

  async restore(ids: string[]): Promise<void> {
    await this.db<RawDatabaseVisualTemplateRow>('visual_templates')
      .whereIn('id', ids)
      .update({ deleted: false });
  }

  async getDryRunInputs(id: string): Promise<Record<string, unknown> | null> {
    const row = await this.db<RawDatabaseVisualTemplateRow>('visual_templates')
      .where({ id })
      .select('dry_run_inputs')
      .first();

    if (!row) {
      throw new NotFoundError(`Project with id ${id} not found`);
    }

    return row.dry_run_inputs ? JSON.parse(row.dry_run_inputs) : null;
  }

  async setDryRunInputs(
    id: string,
    inputs: Record<string, unknown>,
  ): Promise<void> {
    const result = await this.db<RawDatabaseVisualTemplateRow>('visual_templates')
      .where({ id })
      .update({ dry_run_inputs: JSON.stringify(inputs) });

    if (result === 0) {
      throw new NotFoundError(`Project with id ${id} not found`);
    }
  }

  private serialize(
    data: Omit<VisualTemplateProject, 'deleted'>,
  ): RawDatabaseVisualTemplateRow {
    return {
      id: data.id,
      metadata: data.metadata,
      owner: data.owner,
      nodes: JSON.stringify(data.nodes),
      edges: JSON.stringify(data.edges),
      viewport: data.viewport,
      updated: data.updated,
      deleted: false,
      dry_run_inputs: data.dryRunInputs
        ? JSON.stringify(data.dryRunInputs)
        : undefined,
    };
  }

  private deserialize(
    row: RawDatabaseVisualTemplateRow,
  ): VisualTemplateProject {
    return {
      id: row.id,
      metadata: (typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata) as { name: string; description?: string },
      owner: row.owner,
      nodes: JSON.parse(row.nodes) as VisualTemplateProject['nodes'],
      edges: JSON.parse(row.edges),
      viewport: typeof row.viewport === 'string'
        ? JSON.parse(row.viewport)
        : (row.viewport as { x: number; y: number; zoom: number }),
      updated: row.updated,
      deleted: row.deleted,
      published_at: null,
      dryRunInputs: row.dry_run_inputs
        ? JSON.parse(row.dry_run_inputs)
        : undefined,
    };
  }

  private deserializeWithPublication(
    row: RawDatabaseVisualTemplateRow & {
      published_at?: string;
      published_version?: number;
    },
  ): VisualTemplateProject {
    const baseProject = this.deserialize(row);
    return {
      ...baseProject,
      published_at: row.published_at || null,
    };
  }

  private extractPrefabIds(nodes: any[]): string[] {
    return nodes
      .filter(node => node.type === 'prefab')
      .map(node => node.data?.id)
      .filter(Boolean);
  }

  private generateConnectionId(prefabId: string, templateId: string): string {
    return `${prefabId}-${templateId}`;
  }
}
