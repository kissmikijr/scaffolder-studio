import {
  lintTemplateGraph,
  normalizeRequestToSnapshot,
  findReferenceTokens,
} from './index';
import type { Edge, Node } from '@xyflow/react';
import type {
  AllNodeData,
  ScaffolderAction,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

const noop = () => {};

const makeProperty = (id: string, name: string): Node<AllNodeData> =>
  ({
    id,
    type: 'property',
    position: { x: 0, y: 0 },
    data: { name, variableType: 'string', onChange: noop },
  } as Node<AllNodeData>);

const makeStep = ({
  id,
  stepId,
  actionId = 'debug:log',
  name = 'Step',
  formData = {},
  ifExpr = '',
  schema,
}: {
  id: string;
  stepId?: string;
  actionId?: string;
  name?: string;
  formData?: Record<string, unknown>;
  ifExpr?: string;
  schema?: Record<string, unknown>;
}): Node<AllNodeData> =>
  ({
    id,
    type: 'step',
    position: { x: 0, y: 0 },
    data: {
      type: 'step',
      stepId,
      actionId,
      name,
      if: ifExpr,
      formData,
      schema,
      onChange: noop,
    },
  } as Node<AllNodeData>);

const makeAction = (id: string): ScaffolderAction => ({
  id,
  schema: {
    input: {
      type: 'object',
      required: ['repoUrl'] as any,
      properties: {
        repoUrl: { type: 'string' },
        broken: { type: 'string' },
        result: { type: 'string' },
      },
    } as any,
    output: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
    },
  },
});

describe('findReferenceTokens', () => {
  it('supports bracket and dot step syntax plus wrapped expressions', () => {
    expect(
      findReferenceTokens(
        "before ${{ steps['build'].output['result'] | trim }} after ${{ steps.deploy.output.url }} and parameters.repoUrl",
      ),
    ).toEqual([
      expect.objectContaining({
        type: 'step',
        stepId: 'build',
        outputName: 'result',
      }),
      expect.objectContaining({
        type: 'step',
        stepId: 'deploy',
        outputName: 'url',
      }),
      expect.objectContaining({
        type: 'parameter',
        paramName: 'repoUrl',
      }),
    ]);
  });
});

describe('lintTemplateGraph', () => {
  it('reports unused parameters, broken references, dangling edges, and required fields', () => {
    const snapshot = normalizeRequestToSnapshot({
      nodes: [
        makeProperty('property-used', 'repoUrl'),
        makeProperty('property-unused', 'token'),
        makeStep({
          id: 'build-node',
          stepId: 'build',
          formData: {
            repoUrl: '${{ parameters.repoUrl }}',
            broken: '${{ parameters.missing }}',
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                repoUrl: { type: 'string' },
                broken: { type: 'string' },
              },
            },
            output: {
              type: 'object',
              properties: {
                result: { type: 'string' },
              },
            },
          },
        }),
        makeStep({
          id: 'deploy-node',
          stepId: 'deploy',
          formData: {
            result: '${{ steps.build.output.missing }}',
          },
          schema: {
            input: {
              type: 'object',
              properties: {
                result: { type: 'string' },
              },
            },
          },
        }),
        makeStep({
          id: 'incomplete-node',
          stepId: '',
          actionId: '',
          name: '',
          formData: {},
        }),
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'property-used',
          target: 'build-node',
        } as Edge,
        {
          id: 'edge-2',
          source: 'property-unused',
          target: 'deploy-node',
        } as Edge,
      ],
    });

    const result = lintTemplateGraph(snapshot, {
      actions: [makeAction('debug:log')],
      generatedAt: '2026-03-23T00:00:00.000Z',
      rulesVersion: 'test',
    });

    expect(result.summary).toEqual({
      errorCount: 2,
      warningCount: 6,
      infoCount: 0,
    });
    expect(result.meta).toEqual({
      generatedAt: '2026-03-23T00:00:00.000Z',
      rulesVersion: 'test',
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unused-parameter',
          nodeId: 'property-unused',
        }),
        expect.objectContaining({
          code: 'unknown-parameter',
          nodeId: 'build-node',
        }),
        expect.objectContaining({
          code: 'unknown-step-output',
          nodeId: 'deploy-node',
        }),
        expect.objectContaining({
          code: 'dangling-edge',
          nodeId: 'property-unused',
        }),
        expect.objectContaining({
          code: 'missing-step-id',
          nodeId: 'incomplete-node',
        }),
        expect.objectContaining({
          code: 'missing-step-name',
          nodeId: 'incomplete-node',
        }),
        expect.objectContaining({
          code: 'missing-action-id',
          nodeId: 'incomplete-node',
        }),
        expect.objectContaining({
          code: 'missing-required-input',
          nodeId: 'deploy-node',
        }),
      ]),
    );
  });

  it('treats bare parameter tokens with filters as references when they match a known property name', () => {
    const snapshot = normalizeRequestToSnapshot({
      nodes: [
        makeProperty('property-1', 'alma1234property1'),
        makeStep({
          id: 'step-1',
          stepId: 'build',
          formData: {
            message: 'alma1234property1 | center',
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

    const result = lintTemplateGraph(snapshot, {
      actions: [makeAction('debug:log')],
    });

    expect(
      result.issues.find(issue => issue.code === 'unused-parameter'),
    ).toBeUndefined();
  });

  it('does not warn on step-origin manual edges without inferred dependencies', () => {
    const snapshot = normalizeRequestToSnapshot({
      nodes: [
        makeStep({
          id: 'step-1',
          stepId: 'build',
          formData: {},
        }),
        makeStep({
          id: 'step-2',
          stepId: 'deploy',
          formData: {},
        }),
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'step-1',
          target: 'step-2',
        } as Edge,
      ],
    });

    const result = lintTemplateGraph(snapshot, {
      actions: [makeAction('debug:log')],
    });

    expect(
      result.issues.find(issue => issue.code === 'dangling-edge'),
    ).toBeUndefined();
  });
});
