import type { Node } from '@xyflow/react';
import type {
  AllNodeData,
  PrefabInstanceNodeData,
  StepNodeData,
} from '../types';

export const applyPrefabInstanceOverridesToNode = (
  node: Node<AllNodeData>,
  instanceData: PrefabInstanceNodeData,
): Node<AllNodeData> => {
  const stepIdOverride = instanceData.stepIdOverride?.trim();
  const stepNameOverride = instanceData.stepNameOverride?.trim();

  if (node.type !== 'step' || (!stepIdOverride && !stepNameOverride)) {
    return node;
  }

  return {
    ...node,
    data: {
      ...(node.data as StepNodeData),
      ...(stepIdOverride ? { stepId: stepIdOverride } : {}),
      ...(stepNameOverride ? { name: stepNameOverride } : {}),
    },
  };
};
