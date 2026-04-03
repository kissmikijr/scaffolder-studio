import { test, expect, type Page } from '@playwright/test';
import {
  getGuestAuthToken,
  requestScaffolderStudioApi,
} from '../utils/backendApi';

const makeProperty = (id: string, name: string) => ({
  id,
  type: 'property',
  position: { x: 0, y: 0 },
  data: {
    name,
    variableType: 'string',
  },
});

const makeStep = ({
  id,
  stepId,
  actionId = 'debug:log',
  name = 'Step',
  formData = {},
  schema,
}: {
  id: string;
  stepId?: string;
  actionId?: string;
  name?: string;
  formData?: Record<string, unknown>;
  schema?: Record<string, unknown>;
}) => ({
  id,
  type: 'step',
  position: { x: 0, y: 0 },
  data: {
    type: 'step',
    stepId,
    actionId,
    name,
    if: '',
    formData,
    schema,
  },
});

const getAuthToken = async (page: Page): Promise<string> => {
  return getGuestAuthToken(
    page,
    'Failed to get backend auth token for lint E2E',
  );
};

const lintTemplate = async (
  page: Page,
  body: {
    templateId?: string;
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  },
) => {
  const token = await getAuthToken(page);
  const { response } = await requestScaffolderStudioApi(page, {
    method: 'post',
    path: '/templates/lint',
    data: body,
    token,
  });
  const responseBody = await response.text();

  if (response.ok()) {
    return JSON.parse(responseBody);
  }

  throw new Error(
    `Lint endpoint request failed: ${response.status()} ${
      responseBody || 'No response body'
    }`,
  );
};

test.describe('Scaffolder Studio - Lint Rules API', () => {
  test('reports required field warnings for incomplete steps', async ({
    page,
  }) => {
    const result = await lintTemplate(page, {
      templateId: 'lint-required-fields',
      nodes: [
        makeStep({
          id: 'step-1',
          stepId: '',
          actionId: '',
          name: '',
          formData: {},
        }),
      ],
      edges: [],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-step-id',
          severity: 'warning',
          nodeId: 'step-1',
        }),
        expect.objectContaining({
          code: 'missing-step-name',
          severity: 'warning',
          nodeId: 'step-1',
        }),
        expect.objectContaining({
          code: 'missing-action-id',
          severity: 'warning',
          nodeId: 'step-1',
        }),
      ]),
    );
  });

  test('reports broken parameter references', async ({ page }) => {
    const result = await lintTemplate(page, {
      templateId: 'lint-broken-references',
      nodes: [
        makeStep({
          id: 'step-1',
          stepId: 'build',
          actionId: 'debug:log',
          name: 'Build',
          formData: {
            message: '${{ parameters.repoUrl }}',
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        }),
      ],
      edges: [],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-parameter',
          severity: 'error',
          nodeId: 'step-1',
          fieldPath: 'message',
        }),
      ]),
    );
  });

  test('reports unused parameters', async ({ page }) => {
    const result = await lintTemplate(page, {
      templateId: 'lint-unused-parameters',
      nodes: [makeProperty('property-1', 'repoUrl')],
      edges: [],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unused-parameter',
          severity: 'warning',
          nodeId: 'property-1',
        }),
      ]),
    );
  });

  test('reports dangling property-to-step edges', async ({ page }) => {
    const result = await lintTemplate(page, {
      templateId: 'lint-dangling-edges',
      nodes: [
        makeProperty('property-1', 'repoUrl'),
        makeStep({
          id: 'step-1',
          stepId: 'build',
          actionId: 'debug:log',
          name: 'Build',
          formData: {},
          schema: {
            input: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        }),
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'property-1',
          target: 'step-1',
        },
      ],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'dangling-edge',
          severity: 'warning',
          nodeId: 'property-1',
          relatedNodeIds: ['step-1'],
        }),
      ]),
    );
  });
});
