import { act, renderHook } from '@testing-library/react';
import type { Node, Edge } from '@xyflow/react';
import type { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useTemplateLintResult } from '../useTemplateLintResult';

describe('useTemplateLintResult', () => {
  const flushAsyncState = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces lint requests and groups issues by node id', async () => {
    let resolveLint:
      | ((value: {
          issues: Array<Record<string, unknown>>;
          summary: {
            errorCount: number;
            warningCount: number;
            infoCount: number;
          };
          meta: { rulesVersion: string; generatedAt: string };
        }) => void)
      | undefined;

    const lintTemplate = jest.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          resolveLint = resolve;
        }),
    );

    const api = { lintTemplate } as any;
    const nodes = [
      {
        id: 'node-1',
        type: 'step',
        position: { x: 0, y: 0 },
        data: {
          type: 'step',
          stepId: 'build',
          formData: {},
          if: '',
        },
      },
    ] as Node<AllNodeData>[];

    const { result } = renderHook(() =>
      useTemplateLintResult({
        api,
        templateId: 'template-1',
        nodes,
        edges: [] as Edge[],
        debounceMs: 300,
      }),
    );

    expect(lintTemplate).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLint?.({
        issues: [
          {
            id: 'issue-1',
            ruleId: 'broken-references',
            code: 'unknown-parameter',
            severity: 'error',
            message: 'Unknown parameter',
            nodeId: 'node-1',
          },
          {
            id: 'issue-2',
            ruleId: 'required-fields',
            code: 'missing-required-input',
            severity: 'warning',
            message: 'Missing input',
            nodeId: 'node-1',
          },
        ],
        summary: {
          errorCount: 1,
          warningCount: 1,
          infoCount: 0,
        },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      });
      await flushAsyncState();
    });

    expect(result.current.result?.summary.errorCount).toBe(1);
    expect(result.current.issuesByNodeId.get('node-1')).toHaveLength(2);
  });

  it('ignores stale responses after a newer request starts', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    let resolveSecond: ((value: any) => void) | undefined;

    const lintTemplate = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve;
          }),
      );

    const api = { lintTemplate } as any;
    const baseNode = {
      id: 'node-1',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'build',
        formData: {},
        if: '',
      },
    } as Node<AllNodeData>;

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useTemplateLintResult({
          api,
          templateId: 'template-1',
          nodes,
          edges: [] as Edge[],
          debounceMs: 200,
        }),
      {
        initialProps: {
          nodes: [baseNode],
        },
      },
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await act(async () => {
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(1);

    rerender({
      nodes: [
        {
          ...baseNode,
          data: {
            ...baseNode.data,
            formData: { repoUrl: 'changed' },
          } as AllNodeData,
        },
      ],
    });

    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await act(async () => {
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirst?.({
        issues: [
          {
            id: 'stale',
            ruleId: 'unused-parameters',
            code: 'unused-parameter',
            severity: 'warning',
            message: 'stale',
            nodeId: 'node-1',
          },
        ],
        summary: { errorCount: 0, warningCount: 1, infoCount: 0 },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      });
      await flushAsyncState();
    });

    expect(result.current.result).toBeNull();

    await act(async () => {
      resolveSecond?.({
        issues: [
          {
            id: 'fresh',
            ruleId: 'broken-references',
            code: 'unknown-parameter',
            severity: 'error',
            message: 'fresh',
            nodeId: 'node-1',
          },
        ],
        summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      });
      await flushAsyncState();
    });

    expect(result.current.result?.issues[0].id).toBe('fresh');
  });

  it('does not re-run lint for layout-only node changes', async () => {
    const lintTemplate = jest.fn().mockResolvedValue({
      issues: [],
      summary: {
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      meta: {
        rulesVersion: '1',
        generatedAt: '2026-03-23T00:00:00.000Z',
      },
    });

    const api = { lintTemplate } as any;
    const baseNode = {
      id: 'node-1',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: false,
      data: {
        type: 'step',
        stepId: 'build',
        formData: {},
        if: '',
      },
    } as Node<AllNodeData>;

    const { rerender } = renderHook(
      ({ nodes }) =>
        useTemplateLintResult({
          api,
          templateId: 'template-1',
          nodes,
          edges: [] as Edge[],
          debounceMs: 200,
        }),
      {
        initialProps: {
          nodes: [baseNode],
        },
      },
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(1);

    rerender({
      nodes: [
        {
          ...baseNode,
          position: { x: 120, y: 40 },
          selected: true,
          dragging: true,
        } as Node<AllNodeData>,
      ],
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous lint result visible while a fresh request is loading', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    let resolveSecond: ((value: any) => void) | undefined;

    const lintTemplate = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve;
          }),
      );

    const api = { lintTemplate } as any;
    const baseNode = {
      id: 'node-1',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'build',
        formData: {},
        if: '',
      },
    } as Node<AllNodeData>;

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useTemplateLintResult({
          api,
          templateId: 'template-1',
          nodes,
          edges: [] as Edge[],
          debounceMs: 200,
        }),
      {
        initialProps: {
          nodes: [baseNode],
        },
      },
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
      await flushAsyncState();
    });

    await act(async () => {
      resolveFirst?.({
        issues: [
          {
            id: 'first',
            ruleId: 'broken-references',
            code: 'unknown-parameter',
            severity: 'error',
            message: 'first',
            nodeId: 'node-1',
          },
        ],
        summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      });
      await flushAsyncState();
    });

    expect(result.current.result?.issues[0].id).toBe('first');

    rerender({
      nodes: [
        {
          ...baseNode,
          data: {
            ...baseNode.data,
            formData: { repoUrl: 'changed' },
          } as AllNodeData,
        },
      ],
    });

    expect(result.current.result?.issues[0].id).toBe('first');
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
      await flushAsyncState();
    });

    expect(lintTemplate).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond?.({
        issues: [],
        summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      });
      await flushAsyncState();
    });

    expect(result.current.result?.issues).toHaveLength(0);
  });
});
