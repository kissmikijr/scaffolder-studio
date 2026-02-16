
exports.up = async function upInit(knex) {
  await knex.schema.createTable('visual_templates', table => {
    table.string('id').primary();
    table.string('owner');
    table.json('metadata').notNullable();
    table.json('viewport').notNullable();
    table.text('nodes').notNullable();
    table.text('edges').notNullable();
    table.string('updated').notNullable();
    table.boolean('deleted').defaultTo(false).notNullable();
  });
};

exports.down = async function downInit(knex) {
  await knex.schema.dropTable('visual_templates');
};
