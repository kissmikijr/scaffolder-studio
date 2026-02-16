
exports.up = async function(knex) {
  await knex.schema.createTable('prefabs', table => {
    table.string('id').primary();
    table.text('node').notNullable();
    table.text('title').defaultTo('Untitled');
    table.text('description').defaultTo('No description');
    table.text('owner').notNullable();
    table.boolean('deleted').defaultTo(false).notNullable();
    table.timestamps(true, true);
  });
  await knex.schema.createTable('prefabs_templates_connections', table => {
    table.string('id').primary();
    table.string('prefab_id').notNullable();
    table.string('template_id').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('prefabs');
};
