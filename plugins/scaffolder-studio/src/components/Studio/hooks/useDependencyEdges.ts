import { useMemo } from 'react';
import { Edge, Node } from '@xyflow/react';
import {
  AllNodeData,
  StepNodeData,
  isStepNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import {
  findAllTokens,
  parseTokenContent,
  ParsedToken,
} from '../utils/tokenParser';

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

const extractTokens = (value: unknown): ParsedToken[] => {
  const str = stringifyValue(value);
  return findAllTokens(str)
    .map(t => parseTokenContent(t.content))
    .filter((t): t is ParsedToken => t !== null);
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
  token: ParsedToken;
  targetInputPath: string;
};

const collectReferencesFromValue = (
  value: unknown,
  targetInputPath: string,
  refs: RelationshipReference[],
) => {
  if (typeof value === 'string') {
    for (const token of extractTokens(value)) {
      refs.push({ token, targetInputPath });
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReferencesFromValue(item, targetInputPath, refs);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectReferencesFromValue(nested, targetInputPath, refs);
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
      data: { kind: 'relationship', isRelationship: true },
      selectable: false,
      deletable: false,
      focusable: false,
      zIndex: 500,
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
        const ifReferences: RelationshipReference[] = extractTokens(
          data.if,
        ).map(token => ({
          token,
          targetInputPath: 'if',
        }));
        processReferences(ifReferences, node);
      }

      if (data.formData && typeof data.formData === 'object') {
        const inputProperties = (data.schema as any)?.input?.properties as
          | Record<string, unknown>
          | undefined;
        const allowedInputKeys =
          inputProperties && Object.keys(inputProperties).length > 0
            ? new Set(Object.keys(inputProperties))
            : undefined;
        const inputReferences: RelationshipReference[] = [];
        for (const [inputKey, inputValue] of Object.entries(data.formData)) {
          if (allowedInputKeys && !allowedInputKeys.has(inputKey)) {
            continue;
          }
          collectReferencesFromValue(inputValue, inputKey, inputReferences);
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
): RelationshipGraphResult =>
  useMemo(() => {
    if (!enabled) {
      return EMPTY_RELATIONSHIP_GRAPH;
    }
    return computeRelationshipGraph(nodes);
  }, [enabled, nodes]);
