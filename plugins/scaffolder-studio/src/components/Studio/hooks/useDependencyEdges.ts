import { useMemo } from 'react';
import { Edge, Node } from '@xyflow/react';
import {
  AllNodeData,
  StepNodeData,
  isStepNode,
  isPropertyNode,
  getPropertyBackgroundColor,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { findReferenceTokens } from '@kissmiklosjr/scaffolder-studio-linter';

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

const INPUT_HANDLE_PREFIX = 'in:';
const OUTPUT_HANDLE_PREFIX = 'out:';

const encodeHandlePath = (path: string): string => encodeURIComponent(path);
const decodeHandlePath = (path: string): string => decodeURIComponent(path);

export const RELATIONSHIP_PROPERTY_OUTPUT_HANDLE = 'out:value';
export const RELATIONSHIP_IF_INPUT_HANDLE = 'in:if';

export const toInputHandleId = (path: string): string =>
  `${INPUT_HANDLE_PREFIX}${encodeHandlePath(path)}`;

export const toOutputHandleId = (path: string): string =>
  `${OUTPUT_HANDLE_PREFIX}${encodeHandlePath(path)}`;

export const isRelationshipSourceHandleId = (
  handleId?: string | null,
): boolean => Boolean(handleId && handleId.startsWith(OUTPUT_HANDLE_PREFIX));

export const isRelationshipTargetHandleId = (
  handleId?: string | null,
): boolean => Boolean(handleId && handleId.startsWith(INPUT_HANDLE_PREFIX));

export const fromInputHandleId = (handleId?: string | null): string | null => {
  if (!isRelationshipTargetHandleId(handleId)) {
    return null;
  }
  return decodeHandlePath(handleId!.slice(INPUT_HANDLE_PREFIX.length));
};

export const fromOutputHandleId = (handleId?: string | null): string | null => {
  if (!isRelationshipSourceHandleId(handleId)) {
    return null;
  }
  return decodeHandlePath(handleId!.slice(OUTPUT_HANDLE_PREFIX.length));
};

type HandleSide = 'top' | 'right' | 'bottom' | 'left';
type HandlePair = { sourceHandle: HandleSide; targetHandle: HandleSide };
type RelationshipToken =
  | {
      type: 'parameter';
      paramName: string;
    }
  | {
      type: 'step';
      stepId: string;
      outputName: string;
    };

const FILTER_ONLY_SUFFIX_REGEX =
  /^\s*(?:\|\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\([^()]*\))?\s*)*$/;

const nodeAbsoluteCenter = (
  node: Node<AllNodeData>,
  nodeById: Map<string, Node<AllNodeData>>,
): { x: number; y: number } => {
  const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
  const ox = parent ? parent.position.x : 0;
  const oy = parent ? parent.position.y : 0;
  return {
    x: ox + node.position.x + (node.measured?.width ?? node.width ?? 200) / 2,
    y: oy + node.position.y + (node.measured?.height ?? node.height ?? 80) / 2,
  };
};

// Vertical handles are used unless the target is clearly more horizontal.
// Raise this value to make horizontal handles activate more easily.
const VERTICAL_BIAS = 3;

export const getClosestHandles = (
  source: Node<AllNodeData>,
  target: Node<AllNodeData>,
  nodeById: Map<string, Node<AllNodeData>>,
): HandlePair => {
  const sc = nodeAbsoluteCenter(source, nodeById);
  const tc = nodeAbsoluteCenter(target, nodeById);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  // Use horizontal only when the target is significantly more to the side
  if (Math.abs(dx) > Math.abs(dy) * VERTICAL_BIAS) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }

  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
};

type RelationshipReference = {
  token: RelationshipToken;
  targetInputPath: string;
};

const collectReferencesFromValue = (
  value: unknown,
  targetInputPath: string,
  refs: RelationshipReference[],
  propertyNodeByName: Map<string, Node<AllNodeData>>,
) => {
  if (typeof value === 'string') {
    const parsedTokens = findReferenceTokens(stringifyValue(value));

    for (const token of parsedTokens) {
      if (token.type === 'parameter' && token.paramName) {
        refs.push({
          token: {
            type: 'parameter',
            paramName: token.paramName,
          },
          targetInputPath,
        });
      } else if (token.type === 'step' && token.stepId && token.outputName) {
        refs.push({
          token: {
            type: 'step',
            stepId: token.stepId,
            outputName: token.outputName,
          },
          targetInputPath,
        });
      }
    }

    if (parsedTokens.length === 0) {
      const trimmedValue = value.trim();
      if (
        trimmedValue &&
        !trimmedValue.includes('parameters.') &&
        !trimmedValue.includes('steps')
      ) {
        for (const propertyName of propertyNodeByName.keys()) {
          if (!trimmedValue.startsWith(propertyName)) {
            continue;
          }

          const suffix = trimmedValue.slice(propertyName.length);
          if (!FILTER_ONLY_SUFFIX_REGEX.test(suffix)) {
            continue;
          }

          refs.push({
            token: {
              type: 'parameter',
              paramName: propertyName,
            },
            targetInputPath,
          });
          break;
        }
      }
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReferencesFromValue(
        item,
        targetInputPath,
        refs,
        propertyNodeByName,
      );
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectReferencesFromValue(
        nested,
        targetInputPath,
        refs,
        propertyNodeByName,
      );
    }
  }
};

export type RelationshipGraphResult = {
  relationshipEdges: Edge[];
  relatedStepNodeIds: Set<string>;
};

const EMPTY_RELATIONSHIP_GRAPH: RelationshipGraphResult = {
  relationshipEdges: [],
  relatedStepNodeIds: new Set<string>(),
};

export const createRelationshipGraphSignature = (
  nodes: Node<AllNodeData>[],
): string =>
  JSON.stringify(
    nodes.map(node => ({
      id: node.id,
      parentId: node.parentId,
      type: node.type,
      data: node.data,
    })),
  );

export const computeRelationshipGraph = (
  nodes: Node<AllNodeData>[],
): RelationshipGraphResult => {
  const propertyNodeByName = new Map<string, Node<AllNodeData>>();
  const stepNodeByStepId = new Map<string, Node<AllNodeData>>();

  for (const node of nodes) {
    if (isPropertyNode(node)) {
      propertyNodeByName.set(node.data.name, node);
    } else if (isStepNode(node) && node.data.stepId) {
      stepNodeByStepId.set(node.data.stepId, node);
    }
  }

  const edgeSet = new Set<string>();
  const relationshipEdges: Edge[] = [];
  const relatedStepNodeIds = new Set<string>();

  const addRelationshipEdge = ({
    sourceNode,
    sourceHandle,
    targetNode,
    targetHandle,
  }: {
    sourceNode: Node<AllNodeData>;
    sourceHandle: string;
    targetNode: Node<AllNodeData>;
    targetHandle: string;
  }) => {
    const sourceId = sourceNode.id;
    const targetId = targetNode.id;
    if (sourceId === targetId) {
      return;
    }

    const key = `${sourceId}:${sourceHandle}→${targetId}:${targetHandle}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    relationshipEdges.push({
      id: `rel-${encodeHandlePath(sourceId)}-${encodeHandlePath(
        sourceHandle,
      )}-${encodeHandlePath(targetId)}-${encodeHandlePath(targetHandle)}`,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle,
      type: 'relationship',
      className: 'relationship-edge',
      data: {
        kind: 'relationship',
        isRelationship: true,
        sourceKind:
          sourceHandle === RELATIONSHIP_PROPERTY_OUTPUT_HANDLE
            ? 'parameter'
            : 'stepOutput',
        sourceColor:
          sourceHandle === RELATIONSHIP_PROPERTY_OUTPUT_HANDLE &&
          isPropertyNode(sourceNode)
            ? getPropertyBackgroundColor(sourceNode.data.variableType)
            : undefined,
      },
      selectable: false,
      deletable: false,
      focusable: false,
      zIndex: -1,
    });
  };

  const processReferences = (
    refs: RelationshipReference[],
    targetStepNode: Node<AllNodeData>,
  ) => {
    for (const { token, targetInputPath } of refs) {
      const targetHandle =
        targetInputPath === 'if'
          ? RELATIONSHIP_IF_INPUT_HANDLE
          : toInputHandleId(targetInputPath);

      if (token.type === 'parameter' && token.paramName) {
        const sourcePropertyNode = propertyNodeByName.get(token.paramName);
        if (!sourcePropertyNode) {
          continue;
        }

        relatedStepNodeIds.add(targetStepNode.id);
        addRelationshipEdge({
          sourceNode: sourcePropertyNode,
          sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
          targetNode: targetStepNode,
          targetHandle,
        });
      } else if (token.type === 'step' && token.stepId) {
        const sourceStepNode = stepNodeByStepId.get(token.stepId);
        if (!sourceStepNode || !token.outputName) {
          continue;
        }

        const sourceOutputProperties = (
          (sourceStepNode.data as StepNodeData).schema as any
        )?.output?.properties as Record<string, unknown> | undefined;
        if (
          !sourceOutputProperties ||
          !Object.prototype.hasOwnProperty.call(
            sourceOutputProperties,
            token.outputName,
          )
        ) {
          continue;
        }

        relatedStepNodeIds.add(sourceStepNode.id);
        relatedStepNodeIds.add(targetStepNode.id);
        addRelationshipEdge({
          sourceNode: sourceStepNode,
          sourceHandle: toOutputHandleId(token.outputName),
          targetNode: targetStepNode,
          targetHandle,
        });
      }
    }
  };

  for (const node of nodes) {
    if (isStepNode(node)) {
      const data = node.data as StepNodeData;

      if (data.if) {
        const ifReferences: RelationshipReference[] = [];
        collectReferencesFromValue(
          data.if,
          'if',
          ifReferences,
          propertyNodeByName,
        );
        processReferences(ifReferences, node);
      }

      if (data.formData && typeof data.formData === 'object') {
        const inputReferences: RelationshipReference[] = [];
        for (const [inputKey, inputValue] of Object.entries(data.formData)) {
          collectReferencesFromValue(
            inputValue,
            inputKey,
            inputReferences,
            propertyNodeByName,
          );
        }
        processReferences(inputReferences, node);
      }
    }
  }

  return { relationshipEdges, relatedStepNodeIds };
};

export const computeDependencyEdges = (nodes: Node<AllNodeData>[]): Edge[] =>
  computeRelationshipGraph(nodes).relationshipEdges;

export const useDependencyEdges = (
  nodes: Node<AllNodeData>[],
  enabled = true,
): RelationshipGraphResult => {
  const relationshipGraphSignature = useMemo(
    () => createRelationshipGraphSignature(nodes),
    [nodes],
  );

  return useMemo(() => {
    if (!enabled) {
      return EMPTY_RELATIONSHIP_GRAPH;
    }

    return computeRelationshipGraph(nodes);
    // Relationship edges are derived from node content, not layout. Keeping
    // layout-only drag updates out of this dependency keeps node dragging smooth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, relationshipGraphSignature]);
};
