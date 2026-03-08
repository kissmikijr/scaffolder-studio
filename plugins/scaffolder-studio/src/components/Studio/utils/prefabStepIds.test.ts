import type { Node } from '@xyflow/react';
import type {
  AllNodeData,
  Prefab,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import {
  createUniqueStepId,
  getPrefabCacheKey,
  normalizePrefabStepIdOverrides,
} from './prefabStepIds';

describe('prefabStepIds', () => {
  it('creates suffix-based unique step ids', () => {
    expect(createUniqueStepId('publish', ['publish', 'publish-1'])).toBe(
      'publish-2',
    );
  });

  it('backfills stepIdOverride for colliding prefab step instances', () => {
    const existingStep: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'publish',
        if: '',
        formData: {},
        onChange: jest.fn(),
      } as any,
    };

    const prefabInstance: Node<AllNodeData> = {
      id: 'prefab-instance',
      type: 'prefab',
      position: { x: 200, y: 0 },
      data: {
        type: 'prefab',
        id: 'prefab-1',
      } as any,
    };

    const prefab: Prefab = {
      id: 'prefab-1',
      node: {
        id: 'stored-step-node',
        type: 'step',
        position: { x: 0, y: 0 },
        data: {
          type: 'step',
          stepId: 'publish',
          name: 'Publish',
          if: '',
          formData: {},
          onChange: jest.fn(),
        } as any,
      } as any,
    };

    const normalized = normalizePrefabStepIdOverrides(
      [existingStep, prefabInstance],
      new Map([[getPrefabCacheKey('prefab-1'), prefab]]),
    );

    expect((normalized[1].data as any).stepIdOverride).toBe('publish-1');
  });

  it('keeps an existing unique override during backfill', () => {
    const prefabInstance: Node<AllNodeData> = {
      id: 'prefab-instance',
      type: 'prefab',
      position: { x: 200, y: 0 },
      data: {
        type: 'prefab',
        id: 'prefab-1',
        stepIdOverride: 'publish-5',
      } as any,
    };

    const prefab: Prefab = {
      id: 'prefab-1',
      node: {
        id: 'stored-step-node',
        type: 'step',
        position: { x: 0, y: 0 },
        data: {
          type: 'step',
          stepId: 'publish',
          name: 'Publish',
          if: '',
          formData: {},
          onChange: jest.fn(),
        } as any,
      } as any,
    };

    const normalized = normalizePrefabStepIdOverrides(
      [prefabInstance],
      new Map([[getPrefabCacheKey('prefab-1'), prefab]]),
    );

    expect((normalized[0].data as any).stepIdOverride).toBe('publish-5');
  });
});
