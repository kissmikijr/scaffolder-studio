import { act, renderHook } from '@testing-library/react';
import {
  isDraftNewerThanServer,
  readTemplateDraft,
  useTemplateDraftPersistence,
  toContentHash,
} from '../useTemplateDraftPersistence';

const mockUpdate = jest.fn();

jest.mock('@backstage/core-plugin-api', () => ({
  createApiRef: () => ({}),
  useApi: () => ({
    update: mockUpdate,
  }),
}));

describe('useTemplateDraftPersistence', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    localStorage.clear();
  });

  const createState = (name: string) => ({
    nodes: [
      {
        id: 'template-node',
        type: 'template',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'template',
          name,
          onChange: () => { },
        },
      },
    ] as any,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: { name },
  });

  it('tracks dirty state against persisted baseline', () => {
    const { result, rerender } = renderHook(
      ({ name }) =>
        useTemplateDraftPersistence({
          templateId: 'template-1',
          state: createState(name),
          enabled: true,
          publishedAt: null,
        }),
      {
        initialProps: { name: 'Initial' },
      },
    );

    act(() => {
      result.current.setPersistedState(createState('Initial') as any);
    });
    expect(result.current.isDirty).toBe(false);

    rerender({ name: 'Changed' });
    expect(result.current.isDirty).toBe(true);
  });

  it('saves to backend and clears dirty state', async () => {
    mockUpdate.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ name }) =>
        useTemplateDraftPersistence({
          templateId: 'template-2',
          state: createState(name),
          enabled: true,
          publishedAt: null,
        }),
      {
        initialProps: { name: 'Initial' },
      },
    );

    act(() => {
      result.current.setPersistedState(createState('Initial') as any);
    });

    rerender({ name: 'Changed' });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.isDirty).toBe(false);
  });

  it('reads draft and compares draft recency', () => {
    localStorage.setItem(
      'scaffolder-studio:draft:template-3',
      JSON.stringify({
        version: 1,
        updated: '2026-02-11T10:00:00.000Z',
        state: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          metadata: { name: 'Draft' },
        },
      }),
    );

    const draft = readTemplateDraft('template-3');
    expect(draft).not.toBeNull();
    expect(isDraftNewerThanServer(draft!, '2026-02-10T10:00:00.000Z')).toBe(
      true,
    );
    expect(isDraftNewerThanServer(draft!, '2026-02-12T10:00:00.000Z')).toBe(
      false,
    );
  });
});

describe('toContentHash', () => {
  const baseState = {
    nodes: [
      {
        id: 'node-1',
        type: 'template',
        position: { x: 100, y: 200 },
        selected: false,
        data: { nodeType: 'template', name: 'My Template' },
      },
    ] as any,
    edges: [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'custom-step',
      },
    ] as any,
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: { name: 'My Template' },
  };

  it('produces same hash when only viewport changes', () => {
    const withDifferentViewport = {
      ...baseState,
      viewport: { x: 500, y: -300, zoom: 0.75 },
    };

    expect(toContentHash(baseState)).toBe(toContentHash(withDifferentViewport));
  });

  it('produces same hash when only node positions change', () => {
    const withDifferentPositions = {
      ...baseState,
      nodes: baseState.nodes.map((n: any) => ({
        ...n,
        position: { x: 999, y: 888 },
      })),
    };

    expect(toContentHash(baseState)).toBe(
      toContentHash(withDifferentPositions),
    );
  });

  it('produces same hash when only node selected changes', () => {
    const withSelection = {
      ...baseState,
      nodes: baseState.nodes.map((n: any) => ({
        ...n,
        selected: true,
      })),
    };

    expect(toContentHash(baseState)).toBe(toContentHash(withSelection));
  });

  it('produces same hash when dragging/measured fields change', () => {
    const withLayoutFields = {
      ...baseState,
      nodes: baseState.nodes.map((n: any) => ({
        ...n,
        dragging: true,
        measured: { width: 240, height: 120 },
        width: 240,
        height: 120,
      })),
    };

    expect(toContentHash(baseState)).toBe(toContentHash(withLayoutFields));
  });

  it('produces DIFFERENT hash when node data changes', () => {
    const withDifferentData = {
      ...baseState,
      nodes: baseState.nodes.map((n: any) => ({
        ...n,
        data: { ...n.data, name: 'Renamed Template' },
      })),
    };

    expect(toContentHash(baseState)).not.toBe(
      toContentHash(withDifferentData),
    );
  });

  it('produces DIFFERENT hash when metadata name changes', () => {
    const withDifferentMetadata = {
      ...baseState,
      metadata: { name: 'Different Name' },
    };

    expect(toContentHash(baseState)).not.toBe(
      toContentHash(withDifferentMetadata),
    );
  });

  it('produces DIFFERENT hash when edges change', () => {
    const withDifferentEdges = {
      ...baseState,
      edges: [],
    };

    expect(toContentHash(baseState)).not.toBe(
      toContentHash(withDifferentEdges),
    );
  });

  it('produces DIFFERENT hash when a node is added', () => {
    const withExtraNode = {
      ...baseState,
      nodes: [
        ...baseState.nodes,
        {
          id: 'node-2',
          type: 'step',
          position: { x: 400, y: 200 },
          data: { type: 'step', actionId: 'fetch:plain' },
        },
      ],
    };

    expect(toContentHash(baseState)).not.toBe(
      toContentHash(withExtraNode),
    );
  });
});

describe('content-aware updated timestamp', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    localStorage.clear();
  });

  const createStateFull = (overrides: Record<string, any> = {}) => ({
    nodes: [
      {
        id: 'template-node',
        type: 'template',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'template',
          name: 'Test',
          onChange: () => { },
        },
        ...overrides.nodeOverrides,
      },
    ] as any,
    edges: [] as any,
    viewport: overrides.viewport || { x: 0, y: 0, zoom: 1 },
    metadata: { name: overrides.metadataName || 'Test' },
  });

  it('preserves old timestamp for layout-only changes', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const serverUpdated = '2026-01-15T10:00:00.000Z';

    const { result, rerender } = renderHook(
      ({ viewport }) =>
        useTemplateDraftPersistence({
          templateId: 'template-ts',
          state: createStateFull({ viewport }),
          enabled: true,
          publishedAt: null,
        }),
      {
        initialProps: { viewport: { x: 0, y: 0, zoom: 1 } },
      },
    );

    // Set persisted state with the server's original timestamp
    act(() => {
      result.current.setPersistedState(
        createStateFull({}) as any,
        serverUpdated,
      );
    });

    // Change only viewport (layout-only change)
    rerender({ viewport: { x: 500, y: -300, zoom: 0.75 } });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveNow();
    });

    // The updated timestamp sent to the backend should be the OLD server timestamp
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0].updated).toBe(serverUpdated);
  });

  it('bumps timestamp for content changes', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const serverUpdated = '2026-01-15T10:00:00.000Z';

    const { result, rerender } = renderHook(
      ({ metadataName }) =>
        useTemplateDraftPersistence({
          templateId: 'template-ts2',
          state: createStateFull({ metadataName }),
          enabled: true,
          publishedAt: null,
        }),
      {
        initialProps: { metadataName: 'Test' },
      },
    );

    act(() => {
      result.current.setPersistedState(
        createStateFull({}) as any,
        serverUpdated,
      );
    });

    // Change content (metadata name changes)
    rerender({ metadataName: 'Renamed' });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveNow();
    });

    // The updated timestamp should be NEW (not the old server timestamp)
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0].updated).not.toBe(serverUpdated);
  });
});
