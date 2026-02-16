import {
  Prefab,
  PrefabNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Node } from '@xyflow/react';
import { AllNodeData } from './types';

export const onChange =
  (setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>) =>
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds: Node<AllNodeData>[]) =>
        nds?.map(n =>
          n.id === nodeId
            ? {
              ...n,
              data: { ...n.data, ...data } as AllNodeData,
            }
            : n,
        ),
      );
    };

export const onChangePrefab =
  (setPrefab: React.Dispatch<React.SetStateAction<Prefab>>) =>
    (_nodeId: string, data: PrefabNodeData) => {
      setPrefab((prev: Prefab) => {
        if (!prev || !prev.node) return prev;

        // Check if the data actually changed to avoid unnecessary updates
        const newNodeData = { ...prev.node.data, ...data };
        const hasChanged =
          JSON.stringify(prev.node.data) !== JSON.stringify(newNodeData);

        if (!hasChanged) return prev;

        return {
          ...prev,
          node: {
            ...prev.node,
            ...newNodeData,
            data: newNodeData,
          },
        };
      });
    };
