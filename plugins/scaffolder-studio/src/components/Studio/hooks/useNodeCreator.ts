import { useCallback } from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import {
  AllNodeData,
  Prefab,
  TemplateNodeData,
  ParametersNodeData,
  StepNodeData,
  OutputNodeData,
  isParametersNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { getNodeBase } from '../nodeBase';
import { onChange } from '../handlers';
import {
  calculateParentParamsSize,
  createPropertyNode,
  getNextGlobalPropertyName,
} from '../utils/nodeFunctions';
import { getStepIdOverrideForPrefabInstance } from '../utils/prefabStepIds';

interface UseNodeCreatorProps {
  nodes: Node<AllNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<any[]>>;
  connectSourceNodeIdRef: React.MutableRefObject<string | null>;
  setSelectedNode: (node: Node<AllNodeData> | undefined) => void;
  handleTabChange: (tab: string) => void;
  onAddProperty: (parentId: string) => void;
  loadPrefab: (id: string, version?: string) => Promise<Prefab>;
  promptForStepPrefabOverrides: (defaults: {
    stepId: string;
    name: string;
  }) => Promise<{ stepId: string; name: string } | null>;
}

export const useNodeCreator = ({
  nodes,
  setNodes,
  setEdges,
  connectSourceNodeIdRef,
  setSelectedNode,
  handleTabChange,
  onAddProperty,
  loadPrefab,
  promptForStepPrefabOverrides,
}: UseNodeCreatorProps) => {
  const { screenToFlowPosition } = useReactFlow();

  const getNodeDimensions = useCallback((node: Node<AllNodeData>) => {
    return {
      width: node.measured?.width ?? node.width ?? 240,
      height: node.measured?.height ?? node.height ?? 120,
    };
  }, []);

  const getAbsoluteNodePosition = useCallback(
    (node: Node<AllNodeData>) => {
      let absoluteX = node.position.x;
      let absoluteY = node.position.y;
      let parentId = node.parentId;

      while (parentId) {
        const searchId = parentId;
        const parent = nodes.find(n => n.id === searchId);
        if (!parent) {
          break;
        }
        absoluteX += parent.position.x;
        absoluteY += parent.position.y;
        parentId = parent.parentId;
      }

      return { x: absoluteX, y: absoluteY };
    },
    [nodes],
  );

  const getDefaultSizeForType = useCallback((type: string) => {
    if (type === 'template') return { width: 260, height: 160 };
    if (type === 'parameters') return { width: 300, height: 200 };
    if (type === 'templateOutput') return { width: 260, height: 120 };
    if (type === 'property') return { width: 180, height: 100 };
    if (type === 'prefab') return { width: 240, height: 140 };
    return { width: 220, height: 120 }; // step fallback
  }, []);

  const getClosestTargetHandle = useCallback(
    ({
      sourceNode,
      sourceHandleId,
      targetPosition,
      targetType,
    }: {
      sourceNode: Node<AllNodeData>;
      sourceHandleId?: string;
      targetPosition: { x: number; y: number };
      targetType?: Node<AllNodeData>['type'];
    }) => {
      const sourceSize = getNodeDimensions(sourceNode);
      const targetSize = getDefaultSizeForType(targetType ?? 'step');

      const sourceAbsolutePosition = getAbsoluteNodePosition(sourceNode);
      const sourceCenter = {
        x: sourceAbsolutePosition.x + sourceSize.width / 2,
        y: sourceAbsolutePosition.y + sourceSize.height / 2,
      };
      const sourceAnchor = (() => {
        switch (sourceHandleId) {
          case 'top':
            return { x: sourceCenter.x, y: sourceAbsolutePosition.y };
          case 'right':
            return {
              x: sourceAbsolutePosition.x + sourceSize.width,
              y: sourceCenter.y,
            };
          case 'bottom':
            return {
              x: sourceCenter.x,
              y: sourceAbsolutePosition.y + sourceSize.height,
            };
          case 'left':
            return { x: sourceAbsolutePosition.x, y: sourceCenter.y };
          default:
            return sourceCenter;
        }
      })();
      const targetCenter = {
        x: targetPosition.x + targetSize.width / 2,
        y: targetPosition.y + targetSize.height / 2,
      };

      const dx = sourceAnchor.x - targetCenter.x;
      const dy = sourceAnchor.y - targetCenter.y;

      if (Math.abs(dx) >= Math.abs(dy)) {
        return dx < 0 ? 'left' : 'right';
      }

      return dy < 0 ? 'top' : 'bottom';
    },
    [getDefaultSizeForType, getNodeDimensions, getAbsoluteNodePosition],
  );

  // Helper to select a newly created node and switch to form tab
  const selectNewNode = useCallback(
    (node: Node<AllNodeData>) => {
      setSelectedNode(node);
      handleTabChange('form');
    },
    [setSelectedNode, handleTabChange],
  );

  const handleAddTemplateNode = useCallback(() => {
    const newNode: Node<TemplateNodeData> = {
      ...getNodeBase(),
      type: 'template',
      position: { x: 100, y: 100 },
      data: {
        nodeType: 'template',
        name: 'Untitled',
        owner: 'me',
        description: 'This is an example template',
        annotations: {},
        spec: {
          type: 'component',
        },
        onChange: onChange(setNodes),
      },
    };

    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    selectNewNode(newNode);
  }, [setNodes, selectNewNode]);

  const createParametersNode = useCallback(
    ({
      position,
      node,
      fromHandleId,
    }: {
      position: { x: number; y: number };
      node: Node<AllNodeData>;
      fromHandleId: string;
    }) => {
      const baseNode = getNodeBase();

      const newNode: Node<ParametersNodeData> = {
        ...baseNode,
        type: 'parameters',
        position,
        style: { width: 300, height: 200 },
        data: {
          type: 'parameters',
          title: 'Example Title',
          parameters: [],
          onChange: onChange(setNodes),
          onAddProperty,
        },
      };

      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
      selectNewNode(newNode);

      setEdges(eds => [
        ...eds,
        {
          id: `${node.id}-${baseNode.id}`,
          source: node.id,
          sourceHandle: fromHandleId,
          targetHandle: getClosestTargetHandle({
            sourceNode: node,
            sourceHandleId: fromHandleId,
            targetPosition: position,
            targetType: 'parameters',
          }),
          target: baseNode.id,
          style: { strokeWidth: 2 },
        },
      ]);
    },
    [setNodes, setEdges, selectNewNode, onAddProperty, getClosestTargetHandle],
  );

  const handleAddParametersNode = useCallback(
    ({
      x,
      y,
      node,
      fromHandle,
    }: {
      x: number;
      y: number;
      node: Node<AllNodeData>;
      fromHandle: any;
    }) => {
      const position = screenToFlowPosition({ x, y });
      createParametersNode({
        position,
        node,
        fromHandleId: fromHandle.id === 'parameters' ? 'bottom' : fromHandle.id,
      });
    },
    [screenToFlowPosition, createParametersNode],
  );

  const createStepNode = useCallback(
    ({
      position,
      sourceNodeId,
      sourceHandle,
      targetHandle,
    }: {
      position: { x: number; y: number };
      sourceNodeId?: string;
      sourceHandle?: string;
      targetHandle?: string;
    }) => {
      const baseNode = getNodeBase();
      const node = sourceNodeId
        ? nodes.find(n => n.id === sourceNodeId)
        : undefined;
      const resolvedSourceHandle =
        sourceHandle === 'step' ? 'right' : sourceHandle ?? 'right';

      const newNode: Node<StepNodeData> = {
        ...baseNode,
        type: 'step',
        position: { x: position.x, y: position.y },
        data: {
          type: 'step',
          name: '',
          stepId: '',
          if: '',
          actionId: '',
          description: '',
          schema: undefined,
          formData: {},
          onChange: onChange(setNodes),
        },
      };

      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
      selectNewNode(newNode);

      if (node) {
        setEdges(eds => [
          ...eds,
          {
            id: `${node.id}-${baseNode.id}`,
            source: node.id,
            target: baseNode.id,
            sourceHandle: resolvedSourceHandle,
            targetHandle:
              targetHandle ??
              getClosestTargetHandle({
                sourceNode: node,
                sourceHandleId: resolvedSourceHandle,
                targetPosition: position,
                targetType: 'step',
              }),
          },
        ]);
      }
    },
    [nodes, setNodes, setEdges, selectNewNode, getClosestTargetHandle],
  );

  const handleAddStepNode = useCallback(
    ({
      x,
      y,
      sourceHandleId,
    }: {
      x: number;
      y: number;
      sourceHandleId?: string;
    }) => {
      const position = screenToFlowPosition({ x, y });
      createStepNode({
        position,
        sourceNodeId: connectSourceNodeIdRef.current ?? undefined,
        sourceHandle: sourceHandleId,
      });
    },
    [connectSourceNodeIdRef, screenToFlowPosition, createStepNode],
  );

  const createOutputNode = useCallback(
    ({
      position,
      sourceNodeId,
      sourceHandle,
    }: {
      position: { x: number; y: number };
      sourceNodeId?: string;
      sourceHandle?: string;
    }) => {
      const baseNode = getNodeBase();
      const node = sourceNodeId
        ? nodes.find(n => n.id === sourceNodeId)
        : undefined;
      if (!node) {
        return;
      }

      const newNode: Node<OutputNodeData> = {
        ...baseNode,
        type: 'templateOutput',
        position,
        data: {
          links: [],
          text: [],
          onChange: onChange(setNodes),
        },
      };

      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
      selectNewNode(newNode);

      setEdges(eds => [
        ...eds,
        {
          id: `${node.id}-${baseNode.id}`,
          source: node.id,
          sourceHandle:
            sourceHandle === 'output'
              ? 'left'
              : sourceHandle ?? (node.type === 'template' ? 'left' : 'right'),
          target: baseNode.id,
          targetHandle: getClosestTargetHandle({
            sourceNode: node,
            sourceHandleId: sourceHandle,
            targetPosition: position,
            targetType: 'templateOutput',
          }),
        },
      ]);
    },
    [nodes, setNodes, setEdges, selectNewNode, getClosestTargetHandle],
  );

  const handleAddOutputNode = useCallback(
    ({
      x,
      y,
      sourceHandleId,
    }: {
      x: number;
      y: number;
      sourceHandleId?: string;
    }) => {
      const position = screenToFlowPosition({ x, y });
      createOutputNode({
        position,
        sourceNodeId: connectSourceNodeIdRef.current ?? undefined,
        sourceHandle: sourceHandleId,
      });
    },
    [connectSourceNodeIdRef, screenToFlowPosition, createOutputNode],
  );

  const handleAddPropertyNode = useCallback(
    ({
      x,
      y,
      sourceHandleId,
    }: {
      x: number;
      y: number;
      sourceHandleId?: string;
    }) => {
      const node = nodes.find(n => n.id === connectSourceNodeIdRef.current);
      if (!node) {
        // eslint-disable-next-line no-console
        console.error('No source node found for connection');
        return;
      }
      const position = screenToFlowPosition({ x, y });

      let targetParentId: string | undefined;

      if (isParametersNode(node)) {
        targetParentId = node.id;
      } else if (isPropertyNode(node) && node.parentId) {
        targetParentId = node.parentId;
      }

      let relativePosition = position;
      let parentNode: Node<AllNodeData> | undefined;

      if (targetParentId) {
        parentNode = nodes.find(n => n.id === targetParentId);
        if (parentNode) {
          relativePosition = {
            x: position.x - parentNode.position.x,
            y: position.y - parentNode.position.y,
          };
        }
      }

      const newNode = createPropertyNode({
        parentId: targetParentId || '',
        position: relativePosition,
        name: getNextGlobalPropertyName(nodes),
        onChange: onChange(setNodes),
      });
      newNode.parentId = targetParentId;
      newNode.extent = targetParentId ? 'parent' : undefined;

      setNodes(nds => {
        const updatedNodes = nds.map(n => {
          if (n.id === targetParentId) {
            return calculateParentParamsSize(n, relativePosition);
          }
          return { ...n, selected: false };
        });

        return [...updatedNodes, newNode];
      });
      selectNewNode(newNode);

      // Create edge to connect to source node
      setEdges(eds => [
        ...eds,
        {
          id: `${node.id}-${newNode.id}`,
          source: node.id,
          target: newNode.id,
          sourceHandle: sourceHandleId ?? 'right',
          targetHandle: getClosestTargetHandle({
            sourceNode: node,
            sourceHandleId,
            targetPosition: position,
            targetType: 'property',
          }),
          type: 'custom-step',
          zIndex: 1001,
        },
      ]);
    },
    [
      nodes,
      connectSourceNodeIdRef,
      screenToFlowPosition,
      setNodes,
      setEdges,
      selectNewNode,
      getClosestTargetHandle,
    ],
  );

  const addPrefabNode = useCallback(
    async (id: string, version?: string) => {
      const nodeId = uuidv4();
      const normalizedVersion = version || undefined;

      try {
        const prefab = await loadPrefab(id, normalizedVersion);
        const refType = prefab.node.type;
        const stepIdOverride =
          prefab.node.type === 'step'
            ? getStepIdOverrideForPrefabInstance({
                baseStepId: (prefab.node.data as StepNodeData).stepId,
                nodes,
              })
            : undefined;
        const stepName =
          prefab.node.type === 'step'
            ? (prefab.node.data as StepNodeData).name?.trim() ||
              (prefab.node.data as StepNodeData).stepId?.trim() ||
              stepIdOverride ||
              'Step'
            : undefined;
        const stepOverrides =
          prefab.node.type === 'step'
            ? await promptForStepPrefabOverrides({
                stepId: stepIdOverride || 'step',
                name: stepName || 'Step',
              })
            : null;

        if (prefab.node.type === 'step' && !stepOverrides) {
          return;
        }

        setNodes(nds => [
          ...nds,
          {
            id: nodeId,
            type: 'prefab',
            name: '',
            position: { x: 100, y: 100 },
            data: {
              id,
              type: 'prefab',
              version: normalizedVersion,
              refType,
              ...(stepOverrides
                ? {
                    stepIdOverride: stepOverrides.stepId,
                    stepNameOverride: stepOverrides.name,
                  }
                : {}),
            },
          },
        ]);
        return;
      } catch {
        setNodes(nds => [
          ...nds,
          {
            id: nodeId,
            type: 'prefab',
            name: '',
            position: { x: 100, y: 100 },
            data: { id, type: 'prefab', version: normalizedVersion },
          },
        ]);
      }
    },
    [loadPrefab, nodes, promptForStepPrefabOverrides, setNodes],
  );

  return {
    handleAddTemplateNode,
    handleAddParametersNode,
    handleAddStepNode,
    handleAddOutputNode,
    handleAddPropertyNode,
    createParametersNode,
    createStepNode,
    createOutputNode,
    addPrefabNode,
  };
};
