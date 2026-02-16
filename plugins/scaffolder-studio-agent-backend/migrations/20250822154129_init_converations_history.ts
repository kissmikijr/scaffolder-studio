import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversations', table => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.text('messages').notNullable();
    table.string('visual_template_id').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('messages');
}
