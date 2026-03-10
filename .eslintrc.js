module.exports = {
  root: true,
  overrides: [
    {
      files: ['**/e2e-tests/**/*.ts'],
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'test',
            property: 'only',
            message:
              'Do not commit Playwright test.only. Use -g/--grep for local focus runs.',
          },
        ],
      },
    },
  ],
};
