
exports.up = async function upPrefabLibrary(knex) {
  await knex.schema.createTable('prefab_library', table => {
    table.string('id').primary();
    table.string('prefab_id').notNullable();
    table.text('node').notNullable();
    table.text('title').defaultTo('Untitled');
    table.text('description').defaultTo('No description');
    table.text('owner').notNullable();
    table.text('version').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function downPrefabLibrary(knex) {
  await knex.schema.dropTable('prefab_library');
};
