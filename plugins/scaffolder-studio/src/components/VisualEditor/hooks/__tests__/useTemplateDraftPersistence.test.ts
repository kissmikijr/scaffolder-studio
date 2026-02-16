import { act, renderHook } from '@testing-library/react';
import {
  isDraftNewerThanServer,
  readTemplateDraft,
  useTemplateDraftPersistence,
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
          onChange: () => {},
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
      'visual-editor:draft:template-3',
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
