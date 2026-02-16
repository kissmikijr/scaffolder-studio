
exports.up = async function(knex) {
  await knex.schema.alterTable('visual_templates', table => {
    table.text('dry_run_inputs').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('visual_templates', table => {
    table.dropColumn('dry_run_inputs');
  });
};
