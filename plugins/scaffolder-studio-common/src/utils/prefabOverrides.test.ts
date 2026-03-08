import type { Node } from '@xyflow/react';
import type { AllNodeData, PrefabInstanceNodeData } from '../types';
import { applyPrefabInstanceOverridesToNode } from './prefabOverrides';

describe('applyPrefabInstanceOverridesToNode', () => {
  it('applies stepIdOverride to a resolved step node', () => {
    const resolvedStepNode: Node<AllNodeData> = {
      id: 'resolved-step',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '',
        actionId: 'debug:log',
        formData: {},
        onChange: jest.fn(),
      } as any,
    };

    const instanceData: PrefabInstanceNodeData = {
      type: 'prefab',
      id: 'prefab-1',
      stepIdOverride: 'publish-1',
      stepNameOverride: 'Publish Copy',
    };

    const overriddenNode = applyPrefabInstanceOverridesToNode(
      resolvedStepNode,
      instanceData,
    );

    expect((overriddenNode.data as any).stepId).toBe('publish-1');
    expect((overriddenNode.data as any).name).toBe('Publish Copy');
  });
});
