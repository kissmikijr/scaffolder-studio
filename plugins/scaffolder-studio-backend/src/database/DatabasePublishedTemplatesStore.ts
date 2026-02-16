import {
  resolvePackagePath,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import { PublishedTemplate, PublishedTemplatesStore } from './types';
import { v4 as uuid } from 'uuid';

const migrationsDir = resolvePackagePath(
  '@kissmiklosjr/plugin-scaffolder-studio-backend',
  'migrations',
);

type RawDbProjectRow = PublishedTemplate;

export class DatabasePublishedTemplatesStore
  implements PublishedTemplatesStore
{
  static async create(options: {
    database: DatabaseService;
  }): Promise<DatabasePublishedTemplatesStore> {
    const { database } = options;
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DatabasePublishedTemplatesStore(client);
  }

  private constructor(private readonly db: Knex) {}

  async cleanup(): Promise<void> {
    await this.db.destroy();
  }

  async list(): Promise<PublishedTemplate[]> {
    const result = await this.db.raw(
      `
        SELECT * FROM published_templates pt1
WHERE pt1.unpublished = false
AND pt1.version = (
  SELECT MAX(pt2.version) 
  FROM published_templates pt2 
  WHERE pt2.visual_template_id = pt1.visual_template_id 
  AND pt2.unpublished = false
)
ORDER BY pt1.published_at DESC;
        `,
    );
    // For knex.raw, result.rows (pg) or result[0] (mysql) may contain the data
    const rows =
      Array.isArray(result) && result.length > 0 && Array.isArray(result[0])
        ? result[0]
        : result.rows ?? [];
    return Array.isArray(rows) ? rows : [];
  }

  async publish({
    visualTemplateId,
    publishedBy,
    scaffolderTemplate,
  }: {
    visualTemplateId: string;
    publishedBy: string;
    scaffolderTemplate: string;
  }): Promise<void> {
    const result = await this.db('published_templates')
      .where({ visual_template_id: visualTemplateId })
      .max('version as maxVersion')
      .first();

    const nextVersion = (result?.maxVersion || 0) + 1;

    await this.db<RawDbProjectRow>('published_templates').insert({
      id: uuid(),
      visual_template_id: visualTemplateId,
      published_by: publishedBy,
      published_at: this.db.fn.now(),
      scaffolder_template: scaffolderTemplate,
      version: nextVersion,
      unpublished: false,
      unpublished_at: null,
    });
  }

  async unpublish(id: string): Promise<void> {
    const templateRow = await this.db<RawDbProjectRow>('published_templates')
      .where({ id })
      .select('visual_template_id')
      .first();

    if (!templateRow) {
      throw new Error(`Published template with id ${id} not found`);
    }

    await this.db<RawDbProjectRow>('published_templates')
      .where({ visual_template_id: templateRow.visual_template_id })
      .update({
        unpublished: true,
        unpublished_at: this.db.fn.now(),
      });
  }
}
