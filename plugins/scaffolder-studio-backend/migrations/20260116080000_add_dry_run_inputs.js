
exports.up = async function upAddDryRunInputs(knex) {
  await knex.schema.alterTable('visual_templates', table => {
    table.text('dry_run_inputs').nullable();
  });
};

exports.down = async function downAddDryRunInputs(knex) {
  await knex.schema.alterTable('visual_templates', table => {
    table.dropColumn('dry_run_inputs');
  });
};
