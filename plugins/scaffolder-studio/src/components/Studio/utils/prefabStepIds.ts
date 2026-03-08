import type { Node } from '@xyflow/react';
import {
  AllNodeData,
  Prefab,
  isPrefabNode,
  isStepNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

const DEFAULT_STEP_ID = 'step';

export const getPrefabCacheKey = (id: string, version?: string) =>
  `${id}::${version ?? ''}`;

const normalizeStepIdBase = (stepId?: string) => {
  const trimmed = stepId?.trim();
  return trimmed || DEFAULT_STEP_ID;
};

export const createUniqueStepId = (
  stepId: string | undefined,
  usedStepIds: Iterable<string>,
) => {
  const baseStepId = normalizeStepIdBase(stepId);
  const reserved = new Set(
    Array.from(usedStepIds)
      .map(value => value.trim())
      .filter(Boolean),
  );

  if (!reserved.has(baseStepId)) {
    return baseStepId;
  }

  let suffix = 1;
  let candidate = `${baseStepId}-${suffix}`;
  while (reserved.has(candidate)) {
    suffix += 1;
    candidate = `${baseStepId}-${suffix}`;
  }

  return candidate;
};

export const collectAssignedStepIds = (
  nodes: Node<AllNodeData>[],
  excludeNodeId?: string,
) => {
  const usedStepIds = new Set<string>();

  nodes.forEach(node => {
    if (node.id === excludeNodeId) {
      return;
    }

    if (isStepNode(node)) {
      const stepId = node.data.stepId?.trim();
      if (stepId) {
        usedStepIds.add(stepId);
      }
      return;
    }

    if (isPrefabNode(node)) {
      const stepId = node.data.stepIdOverride?.trim();
      if (stepId) {
        usedStepIds.add(stepId);
      }
    }
  });

  return usedStepIds;
};

export const getStepIdOverrideForPrefabInstance = ({
  baseStepId,
  nodes,
  excludeNodeId,
}: {
  baseStepId?: string;
  nodes: Node<AllNodeData>[];
  excludeNodeId?: string;
}) =>
  createUniqueStepId(baseStepId, collectAssignedStepIds(nodes, excludeNodeId));

export const normalizePrefabStepIdOverrides = (
  nodes: Node<AllNodeData>[],
  prefabsByKey: Map<string, Prefab>,
) => {
  let changed = false;
  const usedStepIds = new Set<string>();

  const nextNodes = nodes.map(node => {
    if (isStepNode(node)) {
      const stepId = node.data.stepId?.trim();
      if (stepId) {
        usedStepIds.add(stepId);
      }
      return node;
    }

    if (!isPrefabNode(node)) {
      return node;
    }

    const prefab = prefabsByKey.get(
      getPrefabCacheKey(node.data.id, node.data.version),
    );

    if (!prefab || prefab.node.type !== 'step') {
      return node;
    }

    const existingOverride = node.data.stepIdOverride?.trim();
    const nextOverride =
      existingOverride && !usedStepIds.has(existingOverride)
        ? existingOverride
        : createUniqueStepId((prefab.node.data as any).stepId, usedStepIds);

    usedStepIds.add(nextOverride);

    if (existingOverride === nextOverride) {
      return node;
    }

    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        stepIdOverride: nextOverride,
      },
    };
  });

  return changed ? nextNodes : nodes;
};
