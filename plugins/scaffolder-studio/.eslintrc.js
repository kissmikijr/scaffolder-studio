const config = require('@backstage/cli/config/eslint-factory')(__dirname);
config.overrides = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@material-ui/core',
              message: 'Please use @mui/material instead.',
            },
            {
              name: '@material-ui/icons',
              message: 'Please use @mui/icons-material instead.',
            },
          ],
          patterns: [], // Clear patterns to allow @mui/material
        },
      ],
    },
  },
];
module.exports = config;
