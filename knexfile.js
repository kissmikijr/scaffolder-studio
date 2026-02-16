// To create a new migration in a plugin, run:
//
//   yarn workspace <package> knex migrate:make <name_with_underscores>
//
// for example:
//
//   yarn workspace @backstage/plugin-catalog-backend knex migrate:make add_feature_foo
//
// This creates a file similar to
//
//   plugins/catalog-backend/migrations/20240206160252_add_feature_foo.js

module.exports = {
  client: 'better-sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
  migrations: {},
};
