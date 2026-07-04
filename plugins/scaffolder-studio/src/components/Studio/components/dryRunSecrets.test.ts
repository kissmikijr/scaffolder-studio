import {
  buildSecretsPayload,
  collectDryRunSecretFields,
  formatSecretLabel,
  getMissingRequiredSecrets,
} from './dryRunSecrets';

describe('dryRunSecrets', () => {
  it('collects secrets from template spec secrets schema', () => {
    const fields = collectDryRunSecretFields({
      template: {
        spec: {
          secrets: {
            schema: {
              required: ['githubToken'],
              properties: {
                githubToken: {
                  title: 'GitHub token',
                  description: 'Used to publish a repository',
                },
                optionalToken: {
                  title: 'Optional token',
                },
              },
            },
          },
          steps: [],
        },
      },
      actions: [],
    });

    expect(fields).toEqual([
      {
        key: 'githubToken',
        label: 'GitHub token',
        description: 'Used to publish a repository',
        required: true,
        sources: [{ type: 'template-schema' }],
      },
      {
        key: 'optionalToken',
        label: 'Optional token',
        required: false,
        sources: [{ type: 'template-schema' }],
      },
    ]);
  });

  it('collects referenced secrets from step expressions', () => {
    const fields = collectDryRunSecretFields({
      template: {
        spec: {
          steps: [
            {
              id: 'publish',
              name: 'Publish',
              action: 'publish:github',
              input: {
                token: '${{ secrets.githubToken }}',
                npmToken: "${{ secrets['npm-token'] }}",
              },
            },
          ],
        },
      },
      actions: [],
    });

    expect(fields).toEqual([
      {
        key: 'githubToken',
        label: 'Github Token',
        required: true,
        sources: [
          {
            type: 'template-reference',
            stepId: 'publish',
            stepName: 'Publish',
            actionId: 'publish:github',
          },
        ],
      },
      {
        key: 'npm-token',
        label: 'Npm Token',
        required: true,
        sources: [
          {
            type: 'template-reference',
            stepId: 'publish',
            stepName: 'Publish',
            actionId: 'publish:github',
          },
        ],
      },
    ]);
  });

  it('merges action metadata secrets with template references', () => {
    const fields = collectDryRunSecretFields({
      template: {
        spec: {
          steps: [
            {
              id: 'publish',
              action: 'publish:github',
              input: {
                token: '${{ secrets.githubToken }}',
              },
            },
          ],
        },
      },
      actions: [
        {
          id: 'publish:github',
          schema: {
            input: { type: 'object', properties: {} },
            secrets: {
              required: ['githubToken'],
              properties: {
                githubToken: {
                  title: 'GitHub Token',
                  description: 'Personal access token',
                },
              },
            },
          },
        },
      ],
    });

    expect(fields).toEqual([
      {
        key: 'githubToken',
        label: 'GitHub Token',
        description: 'Personal access token',
        required: true,
        sources: [
          {
            type: 'action-schema',
            stepId: 'publish',
            actionId: 'publish:github',
          },
          {
            type: 'template-reference',
            stepId: 'publish',
            actionId: 'publish:github',
          },
        ],
      },
    ]);
  });

  it('validates and builds the transient secrets payload', () => {
    const fields = collectDryRunSecretFields({
      template: {
        spec: {
          secrets: {
            schema: {
              required: ['githubToken'],
              properties: {
                githubToken: {},
                optionalToken: {},
              },
            },
          },
          steps: [],
        },
      },
      actions: [],
    });

    expect(
      getMissingRequiredSecrets(fields, {
        githubToken: '',
        optionalToken: 'not persisted',
      }),
    ).toEqual(['githubToken']);

    expect(
      buildSecretsPayload(fields, {
        githubToken: 'secret-value',
        optionalToken: '',
      }),
    ).toEqual({ githubToken: 'secret-value' });
  });

  it('formats generated labels from secret keys', () => {
    expect(formatSecretLabel('githubToken')).toBe('Github Token');
    expect(formatSecretLabel('NPM_TOKEN')).toBe('NPM TOKEN');
    expect(formatSecretLabel('npm-token')).toBe('Npm Token');
  });
});
