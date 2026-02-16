
exports.up = async function(knex) {
  await knex.schema.createTable('published_templates', table => {
    table.string('id').primary();
    table.string('visual_template_id').notNullable();
    table.text('scaffolder_template').notNullable();
    table.string('published_by').notNullable();
    table.integer('version').notNullable();
    table.timestamp('published_at').notNullable();
    table.timestamp('unpublished_at').nullable();
    table.boolean('unpublished').defaultTo(false).notNullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('published_templates');
};
