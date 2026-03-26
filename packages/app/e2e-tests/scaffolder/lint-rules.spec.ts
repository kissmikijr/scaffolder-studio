import { test, expect, type Page } from '@playwright/test';

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

const getBackendBaseCandidates = (): string[] => {
  const configuredBase = process.env.PLAYWRIGHT_URL?.replace(/\/$/, '');
  const candidates = [configuredBase, 'http://localhost:7008'].filter(
    Boolean,
  ) as string[];
  return [...new Set(candidates)];
};

const getAuthToken = async (page: Page): Promise<string> => {
  for (const base of getBackendBaseCandidates()) {
    const response = await page.request.get(`${base}/api/auth/guest/refresh`);
    if (!response.ok()) {
      continue;
    }

    const body = await response.json().catch(() => undefined);
    const token = body?.backstageIdentity?.token as string | undefined;
    if (token) {
      return token;
    }
  }

  throw new Error('Failed to get backend auth token for lint E2E');
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
  let lastStatus = 0;
  let lastBody = '';

  for (const base of getBackendBaseCandidates()) {
    const response = await page.request.post(
      `${base}/api/scaffolder-studio/templates/lint`,
      {
        data: body,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    lastStatus = response.status();
    lastBody = await response.text();

    if (response.ok()) {
      return JSON.parse(lastBody);
    }

    if (response.status() !== 404) {
      break;
    }
  }

  throw new Error(
    `Lint endpoint request failed: ${lastStatus} ${
      lastBody || 'No response body'
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
