import { Knex } from 'knex';
import { Conversation } from './types';
import {
  coreServices,
  createServiceFactory,
  createServiceRef,
  DatabaseService,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';

export const scaffolderAgentServiceRef =
  createServiceRef<ScaffolderAgentServiceInterface>({
    id: 'scaffolder-studio-agent.service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          database: coreServices.database,
        },
        async factory({ database }) {
          return ScaffolderAgentService.create({ database });
        },
      }),
  });

export interface ScaffolderAgentServiceInterface {
  saveConversation(conversation: Conversation): Promise<Conversation>;
  getConversation({
    conversationId,
    visualTemplateId,
  }: {
    conversationId: string;
    visualTemplateId: string;
  }): Promise<Conversation | undefined>;
  getAllConversations({
    visualTemplateId,
  }: {
    visualTemplateId: string;
  }): Promise<Conversation[]>;
  deleteConversation(conversationId: string): Promise<void>;
}

export class ScaffolderAgentService implements ScaffolderAgentServiceInterface {
  private readonly db: Knex;

  constructor({ db }: { db: Knex }) {
    this.db = db;
  }

  private get table() {
    return this.db('conversations');
  }

  static async create({ database }: { database: DatabaseService }) {
    const client = await database.getClient();

    const migrationsDir = resolvePackagePath(
      '@kissmiklosjr/plugin-scaffolder-studio-agent-backend',
      'migrations',
    );
    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new ScaffolderAgentService({ db: client });
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    const data = this.serialize(conversation);
    const rows = await this.db('conversations')
      .insert(data)
      .onConflict('id')
      .merge(['messages', 'title'])
      .returning('*');
    return this.deserialize(rows[0]);
  }

  async getConversation({
    conversationId,
    visualTemplateId,
  }: {
    conversationId: string;
    visualTemplateId: string;
  }): Promise<Conversation | undefined> {
    const row = await this.table
      .where('id', conversationId)
      .andWhere('visual_template_id', visualTemplateId);
    return row.length > 0 ? this.deserialize(row[0]) : undefined;
  }

  async getAllConversations({
    visualTemplateId,
  }: {
    visualTemplateId: string;
  }): Promise<Conversation[]> {
    const rows = await this.table
      .where('visual_template_id', visualTemplateId)
      .orderBy('created_at', 'asc');
    return rows.map(row => this.deserialize(row));
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.table.where('id', conversationId).del();
  }

  private serialize(conversation: Conversation) {
    return {
      id: conversation.id,
      visual_template_id: conversation.visual_template_id,
      messages: JSON.stringify(conversation.messages),
      title: conversation.title,
    };
  }
  private deserialize(row: any) {
    if (!row) {
      throw new Error('Cannot deserialize undefined or null row');
    }
    if (!row.messages) {
      throw new Error(
        `Cannot deserialize row with undefined messages: ${JSON.stringify(
          row,
        )}`,
      );
    }
    return {
      id: row.id,
      visual_template_id: row.visual_template_id,
      messages: JSON.parse(row.messages),
      created_at: row.created_at,
      updated_at: row.updated_at,
      title: row.title,
    };
  }
}
