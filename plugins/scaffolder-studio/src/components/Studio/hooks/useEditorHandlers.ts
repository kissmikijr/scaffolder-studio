import { useCallback, useState, useEffect, useRef } from 'react';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  EdgeChange,
  OnConnectStart,
  OnConnectEnd,
  IsValidConnection,
  useReactFlow,
} from '@xyflow/react';
import {
  AllNodeData,
  Prefab,
  StepRelationshipRef,
  StepNodeData,
  isPrefabNode,
  isTemplateNode,
  isStepNode,
  isPropertyNode,
  isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { v4 as uuidv4 } from 'uuid';
import {
  countIncomingConnections,
  countOutgoingConnections,
  getTemplateOutgoingSlots,
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../utils/connectionLimits';
import {
  RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
  fromInputHandleId,
  fromOutputHandleId,
  isRelationshipSourceHandleId,
  isRelationshipTargetHandleId,
} from './useDependencyEdges';
import { getStepIdOverrideForPrefabInstance } from '../utils/prefabStepIds';

interface UseEditorHandlersProps {
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setSelectedNode: (node: Node<AllNodeData> | undefined) => void;
  handleTabChange: (tab: string) => void;
  setPrefabMenu: (
    menu: { id: string; top: number; left: number } | null,
  ) => void;
  contextMenuNodeIdRef: React.MutableRefObject<string | null>;
  connectSourceNodeIdRef: React.MutableRefObject<string | null>;
  handleAddOutputNode: (params: {
    x: number;
    y: number;
    sourceHandleId?: string;
  }) => void;
  handleAddStepNode: (params: {
    x: number;
    y: number;
    sourceHandleId?: string;
  }) => void;
  handleAddParametersNode: (params: {
    x: number;
    y: number;
    node: Node<AllNodeData>;
    fromHandle: any;
  }) => void;
  handleAddPropertyNode: (params: {
    x: number;
    y: number;
    sourceHandleId?: string;
  }) => void;
  onRelationshipConnectionDrawn?: () => void;
  onChange: (id: string, data: any) => void;
  setSelectedEdge: (edge: Edge | undefined) => void;
  loadPrefab: (id: string, version?: string) => Promise<Prefab>;
  promptForStepPrefabOverrides: (defaults: {
    stepId: string;
    name: string;
  }) => Promise<{ stepId: string; name: string } | null>;
}

export const useEditorHandlers = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  setSelectedNode,
  handleTabChange,
  setPrefabMenu,
  contextMenuNodeIdRef,
  connectSourceNodeIdRef,
  handleAddOutputNode,
  handleAddStepNode,
  handleAddParametersNode,
  handleAddPropertyNode,
  onRelationshipConnectionDrawn,
  onChange,
  setSelectedEdge,
  loadPrefab,
  promptForStepPrefabOverrides,
}: UseEditorHandlersProps) => {
  const { screenToFlowPosition, getEdges } = useReactFlow();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const blockedEdgeRemovalIdsRef = useRef<Set<string>>(new Set());

  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);

      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName || '',
        ) ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'j' || e.key === 'k') {
        const currentNodes = nodesRef.current;
        const sortedNodes = [...currentNodes].sort((a, b) => {
          const yDiff = a.position.y - b.position.y;
          if (Math.abs(yDiff) < 10) {
            return a.position.x - b.position.x;
          }
          return yDiff;
        });

        const selectedIndex = sortedNodes.findIndex(n => n.selected);
        let nextIndex = 0;

        if (selectedIndex !== -1) {
          if (e.key === 'j') {
            nextIndex = (selectedIndex + 1) % sortedNodes.length;
          } else {
            nextIndex =
              (selectedIndex - 1 + sortedNodes.length) % sortedNodes.length;
          }
        }

        const nextNode = sortedNodes[nextIndex];

        if (nextNode) {
          setNodes(nds =>
            nds.map(n => ({
              ...n,
              selected: n.id === nextNode.id,
            })),
          );
          setSelectedNode(nextNode);
          handleTabChange('form');
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setNodes, setSelectedNode, handleTabChange]);

  const mergeNunjucksToken = useCallback(
    (currentValue: string, token: string) => {
      const trimmedCurrent = currentValue.trim();
      if (!trimmedCurrent) {
        return token;
      }
      if (trimmedCurrent.includes(token)) {
        return currentValue;
      }

      const separator = currentValue.endsWith(' ') ? '' : ' ';
      return `${currentValue}${separator}${token}`;
    },
    [],
  );

  const buildRelationshipToken = useCallback(
    (sourceNode: Node<AllNodeData>, sourceHandleId: string): string | null => {
      if (isPropertyNode(sourceNode)) {
        if (sourceHandleId !== RELATIONSHIP_PROPERTY_OUTPUT_HANDLE) {
          return null;
        }

        const propertyName = (sourceNode.data as any).name?.trim();
        if (!propertyName) {
          return null;
        }

        return `\${{ parameters.${propertyName} }}`;
      }

      if (isStepNode(sourceNode)) {
        const outputKey = fromOutputHandleId(sourceHandleId);
        const sourceStepId = (sourceNode.data as StepNodeData).stepId?.trim();
        if (!outputKey || !sourceStepId) {
          return null;
        }

        const outputProperties = (
          (sourceNode.data as StepNodeData).schema as any
        )?.output?.properties as Record<string, unknown> | undefined;
        if (
          !outputProperties ||
          !Object.prototype.hasOwnProperty.call(outputProperties, outputKey)
        ) {
          return null;
        }

        return `\${{ steps['${sourceStepId}'].output['${outputKey}'] }}`;
      }

      return null;
    },
    [],
  );

  const applyRelationshipConnection = useCallback(
    (connection: Connection): boolean => {
      const { source, target, sourceHandle, targetHandle } = connection;

      if (
        !source ||
        !target ||
        !isRelationshipSourceHandleId(sourceHandle) ||
        !isRelationshipTargetHandleId(targetHandle)
      ) {
        return false;
      }

      const currentNodes = nodesRef.current;
      const sourceNode = currentNodes.find(n => n.id === source);
      const targetNode = currentNodes.find(n => n.id === target);

      if (!sourceNode || !targetNode || !isStepNode(targetNode)) {
        return false;
      }

      const targetInputKey = fromInputHandleId(targetHandle);
      if (!targetInputKey) {
        return false;
      }

      const token = buildRelationshipToken(sourceNode, sourceHandle!);
      if (!token) {
        return false;
      }

      setNodes(prevNodes =>
        prevNodes.map(node => {
          if (node.id !== targetNode.id || !isStepNode(node)) {
            return node;
          }

          const stepData = node.data as StepNodeData;
          const existingRefs = Array.isArray(stepData.relationshipRefs)
            ? stepData.relationshipRefs
            : [];
          const outputKey = isStepNode(sourceNode)
            ? fromOutputHandleId(sourceHandle)
            : undefined;
          const nextRef: StepRelationshipRef = {
            sourceNodeId: sourceNode.id,
            sourceKind: isPropertyNode(sourceNode) ? 'property' : 'stepOutput',
            targetField: targetInputKey,
            outputKey: outputKey || undefined,
            lastRenderedToken: token,
          };
          const refIndex = existingRefs.findIndex(
            ref =>
              ref.sourceNodeId === nextRef.sourceNodeId &&
              ref.sourceKind === nextRef.sourceKind &&
              ref.targetField === nextRef.targetField &&
              (ref.outputKey || undefined) === (nextRef.outputKey || undefined),
          );
          const nextRefs =
            refIndex >= 0
              ? existingRefs.map((ref, idx) =>
                  idx === refIndex ? nextRef : ref,
                )
              : [...existingRefs, nextRef];
          const refsChanged =
            refIndex < 0 ||
            existingRefs[refIndex].lastRenderedToken !==
              nextRef.lastRenderedToken;

          if (targetInputKey === 'if') {
            const currentIf = stepData.if ?? '';
            const nextIf = mergeNunjucksToken(currentIf, token);
            if (nextIf === currentIf && !refsChanged) {
              return node;
            }

            return {
              ...node,
              data: {
                ...stepData,
                if: nextIf,
                relationshipRefs: nextRefs,
              },
            };
          }

          const currentFormData =
            stepData.formData && typeof stepData.formData === 'object'
              ? stepData.formData
              : {};
          const currentRawValue = currentFormData[targetInputKey];
          const currentStringValue =
            typeof currentRawValue === 'string' ? currentRawValue : '';
          const nextValue = mergeNunjucksToken(currentStringValue, token);
          if (
            typeof currentRawValue === 'string' &&
            nextValue === currentRawValue &&
            !refsChanged
          ) {
            return node;
          }

          return {
            ...node,
            data: {
              ...stepData,
              formData: {
                ...currentFormData,
                [targetInputKey]: nextValue,
              },
              relationshipRefs: nextRefs,
            },
          };
        }),
      );

      return true;
    },
    [setNodes, buildRelationshipToken, mergeNunjucksToken],
  );

  const isValidConnection = useCallback<IsValidConnection<Edge>>(
    connectionOrEdge => {
      const { source, target, sourceHandle, targetHandle } = connectionOrEdge;
      if (!source || !target || source === target) {
        return false;
      }

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const sourceNode = currentNodes.find(n => n.id === source);
      const targetNode = currentNodes.find(n => n.id === target);
      if (!sourceNode || !targetNode) {
        return false;
      }

      const getEffectiveType = (node: Node<AllNodeData>) => {
        if (isPrefabNode(node)) {
          return (node.data as any).refType || node.type;
        }
        return node.type;
      };

      const sourceEffectiveType = getEffectiveType(sourceNode);
      const targetEffectiveType = getEffectiveType(targetNode);

      const isRelationshipSourceHandle =
        isRelationshipSourceHandleId(sourceHandle);
      const isRelationshipTargetHandle =
        isRelationshipTargetHandleId(targetHandle);

      if (isRelationshipSourceHandle || isRelationshipTargetHandle) {
        if (!isRelationshipSourceHandle || !isRelationshipTargetHandle) {
          return false;
        }

        if (targetEffectiveType !== 'step') {
          return false;
        }

        if (
          sourceEffectiveType !== 'step' &&
          sourceEffectiveType !== 'property'
        ) {
          return false;
        }

        const targetInputKey = fromInputHandleId(targetHandle);
        if (!targetInputKey) {
          return false;
        }

        if (!isStepNode(targetNode)) {
          return false;
        }

        if (targetInputKey === 'if') {
          if (sourceEffectiveType === 'property') {
            return sourceHandle === RELATIONSHIP_PROPERTY_OUTPUT_HANDLE;
          }
          if (sourceEffectiveType === 'step') {
            return Boolean(
              fromOutputHandleId(sourceHandle) &&
                (sourceNode.data as StepNodeData).stepId,
            );
          }
          return false;
        }

        const inputProperties = (
          (targetNode.data as StepNodeData).schema as any
        )?.input?.properties as Record<string, unknown> | undefined;
        const inputKeys =
          inputProperties && Object.keys(inputProperties).length > 0
            ? Object.keys(inputProperties)
            : Object.keys((targetNode.data as StepNodeData).formData ?? {});
        if (!inputKeys.includes(targetInputKey)) {
          return false;
        }

        if (sourceEffectiveType === 'property') {
          return sourceHandle === RELATIONSHIP_PROPERTY_OUTPUT_HANDLE;
        }

        if (sourceEffectiveType === 'step') {
          const outputKey = fromOutputHandleId(sourceHandle);
          if (!outputKey || !(sourceNode.data as StepNodeData).stepId) {
            return false;
          }
          const sourceOutputProperties = (
            (sourceNode.data as StepNodeData).schema as any
          )?.output?.properties as Record<string, unknown> | undefined;
          return Boolean(
            sourceOutputProperties &&
              Object.prototype.hasOwnProperty.call(
                sourceOutputProperties,
                outputKey,
              ),
          );
        }

        return false;
      }

      const sourceOutgoingCount = countOutgoingConnections(
        currentEdges,
        source,
      );
      const targetIncomingCount = countIncomingConnections(
        currentEdges,
        target,
      );

      if (!hasIncomingCapacity(targetEffectiveType, targetIncomingCount)) {
        return false;
      }

      if (isTemplateNode(sourceNode)) {
        const templateSlots = getTemplateOutgoingSlots(
          source,
          currentEdges,
          currentNodes,
        );
        return (
          (targetEffectiveType === 'step' && !templateSlots.hasStep) ||
          (targetEffectiveType === 'parameters' &&
            !templateSlots.hasParameters) ||
          (targetEffectiveType === 'templateOutput' && !templateSlots.hasOutput)
        );
      }

      if (!hasOutgoingCapacity(sourceEffectiveType, sourceOutgoingCount)) {
        return false;
      }

      if (sourceEffectiveType === 'step') {
        return targetEffectiveType === 'step';
      }

      if (sourceEffectiveType === 'parameters') {
        return (
          targetEffectiveType === 'parameters' ||
          targetEffectiveType === 'property'
        );
      }

      if (sourceEffectiveType === 'property') {
        return targetEffectiveType === 'property';
      }

      return false;
    },
    [],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (applyRelationshipConnection(connection)) {
        onRelationshipConnectionDrawn?.();
        return;
      }
      setEdges(eds => addEdge(connection, eds));
    },
    [setEdges, applyRelationshipConnection, onRelationshipConnectionDrawn],
  );

  const handleNodesDelete = useCallback(
    (deletedNodes: Node<AllNodeData>[]) => {
      const deletableNodes = deletedNodes.filter(node => !isTemplateNode(node));
      if (deletableNodes.length === 0) {
        return;
      }

      const currentEdges = edgesRef.current;
      const currentNodes = nodesRef.current;

      setNodes(nds => {
        const remainingNodes = nds.filter(
          n => !deletableNodes.some(dn => dn.id === n.id),
        );

        deletableNodes.forEach(deletedNode => {
          const nodeId = deletedNode.id;
          const incomingEdges = currentEdges.filter(e => e.target === nodeId);
          const outgoingEdges = currentEdges.filter(e => e.source === nodeId);
          const childIds = outgoingEdges.map(e => e.target);

          const newEdges = incomingEdges.flatMap(incomingEdge =>
            outgoingEdges.map(outgoingEdge => {
              const parentId = incomingEdge.source;
              const childId = outgoingEdge.target;
              const parentNode = currentNodes.find(n => n.id === parentId);
              const childNode = currentNodes.find(n => n.id === childId);

              return {
                id: `${parentId}-${childId}`,
                source: parentId,
                target: childId,
                sourceHandle:
                  incomingEdge.sourceHandle ??
                  (parentNode && isStepNode(parentNode) ? 'top' : undefined),
                targetHandle:
                  outgoingEdge.targetHandle ??
                  (childNode && isStepNode(childNode) ? 'top' : undefined),
              };
            }),
          );

          setEdges(eds =>
            eds
              .filter(e => e.source !== nodeId && e.target !== nodeId)
              .concat(newEdges),
          );

          setNodes(existingNodes =>
            existingNodes.map(node =>
              childIds.includes(node.id)
                ? { ...node, position: { ...deletedNode.position } }
                : node,
            ),
          );
        });

        return remainingNodes;
      });
    },
    [setNodes, setEdges],
  );
  const handleOnNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<AllNodeData>) => {
      if (node) {
        setSelectedNode(node);
        setSelectedEdge(undefined);
        handleTabChange('form');
      }
    },
    [setSelectedNode, setSelectedEdge, handleTabChange],
  );

  const handleOnEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (edge) {
        setSelectedEdge(edge);
        setSelectedNode(undefined);
        handleTabChange('form');
      }
    },
    [setSelectedEdge, setSelectedNode, handleTabChange],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent>, node: Node<AllNodeData>) => {
      event.preventDefault();
      if (isPrefabNode(node)) {
        contextMenuNodeIdRef.current = node.id;
        setPrefabMenu({
          id: node.data.id,
          top: event.clientY,
          left: event.clientX,
        });
      }
    },
    [contextMenuNodeIdRef, setPrefabMenu],
  );

  const handleNodesChange: OnNodesChange<Node<AllNodeData>> = useCallback(
    changes => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const blockedTemplateRemovalIds = changes
        .filter(change => change.type === 'remove')
        .map(change => change.id)
        .filter(id => {
          const node = currentNodes.find(n => n.id === id);
          return Boolean(node && isTemplateNode(node));
        });

      if (blockedTemplateRemovalIds.length > 0) {
        blockedEdgeRemovalIdsRef.current = new Set(
          currentEdges
            .filter(
              edge =>
                blockedTemplateRemovalIds.includes(edge.source) ||
                blockedTemplateRemovalIds.includes(edge.target),
            )
            .map(edge => edge.id),
        );
      }

      let processedChanges = changes.filter(change => {
        if (change.type !== 'remove') return true;
        const node = currentNodes.find(n => n.id === change.id);
        return !node || !isTemplateNode(node);
      });

      // Ignore pane-click deselect batches so the current node selection is preserved.
      // React Flow emits select=false changes for selected nodes when clicking empty canvas.
      const hasSelectTrueChange = processedChanges.some(
        change => change.type === 'select' && change.selected === true,
      );
      const hasNonSelectChange = processedChanges.some(
        change => change.type !== 'select',
      );
      if (!hasSelectTrueChange && !hasNonSelectChange) {
        processedChanges = processedChanges.filter(
          change => !(change.type === 'select' && change.selected === false),
        );
      }

      if (isShiftPressed) {
        processedChanges = processedChanges.map(change => {
          if (change.type === 'position' && change.position) {
            const node = currentNodes.find(n => n.id === change.id);
            if (node) {
              const connectedEdges = currentEdges.filter(
                e => e.source === node.id || e.target === node.id,
              );

              if (connectedEdges.length > 0) {
                const edge = connectedEdges[0];
                const isSource = edge.source === node.id;
                const connectedNodeId = isSource ? edge.target : edge.source;
                const connectedNode = currentNodes.find(
                  n => n.id === connectedNodeId,
                );

                if (connectedNode) {
                  // Handle offset mapping (normalized 0-1)
                  const getHandleOffset = (_handleId?: string) => {
                    return 0.5; // All handles are now centered
                  };

                  const draggingHandleId = isSource
                    ? edge.sourceHandle
                    : edge.targetHandle;
                  const staticHandleId = isSource
                    ? edge.targetHandle
                    : edge.sourceHandle;

                  const draggingOffset = getHandleOffset(
                    draggingHandleId ?? undefined,
                  );
                  const staticOffset = getHandleOffset(
                    staticHandleId ?? undefined,
                  );

                  const draggingHeight =
                    node.measured?.height ?? node.height ?? 40;
                  const staticHeight =
                    connectedNode.measured?.height ??
                    connectedNode.height ??
                    40;
                  const draggingWidth =
                    node.measured?.width ?? node.width ?? 150;
                  const staticWidth =
                    connectedNode.measured?.width ?? connectedNode.width ?? 150;

                  // Vertical alignment (snap to X)
                  // Handles are typically horizontally centered
                  const targetX =
                    connectedNode.position.x +
                    staticWidth * 0.5 -
                    draggingWidth * 0.5;

                  // Horizontal alignment (snap to Y)
                  // targetY + draggingHeight * draggingOffset = connectedNode.position.y + staticHeight * staticOffset
                  const targetY =
                    connectedNode.position.y +
                    staticHeight * staticOffset -
                    draggingHeight * draggingOffset;

                  const deltaX = Math.abs(change.position.x - targetX);
                  const deltaY = Math.abs(change.position.y - targetY);

                  if (deltaX < deltaY) {
                    return {
                      ...change,
                      position: {
                        ...change.position,
                        x: targetX,
                      },
                    };
                  }

                  return {
                    ...change,
                    position: {
                      ...change.position,
                      y: targetY,
                    },
                  };
                }
              }
            }
          }
          return change;
        });
      }

      setNodes(oldNodes => applyNodeChanges(processedChanges, oldNodes));
    },
    [setNodes, isShiftPressed],
  );

  useEffect(() => {
    // Keep one node selected at all times so the side panel always has context.
    const anyNodeSelected = nodes.some(n => n.selected);
    const anyEdgeSelected = edges.some(e => e.selected);

    if (!anyNodeSelected && !anyEdgeSelected && nodes.length > 0) {
      setNodes(nds => {
        // Re-check inside functional update for latest state
        if (nds.some(n => n.selected)) return nds;
        const currentEdges = getEdges();
        if (currentEdges.some(e => e.selected)) return nds;

        const templateNode = nds.find(n => isTemplateNode(n));
        const fallbackNode = templateNode ?? nds[0];
        if (!fallbackNode) return nds;

        return nds.map(n => ({
          ...n,
          selected: n.id === fallbackNode.id,
        }));
      });
    }
  }, [nodes, edges, setNodes, getEdges]);

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const blockedIds = blockedEdgeRemovalIdsRef.current;
      const filteredChanges = changes.filter(change => {
        if (change.type !== 'remove') return true;
        return !blockedIds.has(change.id);
      });

      blockedEdgeRemovalIdsRef.current = new Set();
      setEdges(eds => {
        const updatedEdges = applyEdgeChanges(filteredChanges, eds);
        const selected = updatedEdges.find(e => e.selected);
        if (selected) {
          setSelectedEdge(selected);
          setSelectedNode(undefined);
          setNodes(currentNodes => {
            if (!currentNodes.some(node => node.selected)) {
              return currentNodes;
            }

            return currentNodes.map(node =>
              node.selected ? { ...node, selected: false } : node,
            );
          });
        } else if (!nodesRef.current.some(n => n.selected)) {
          // If no edge and no node is selected, EdgeSideContent will be empty.
          // But our useEffect normally picks a fallback node.
          setSelectedEdge(undefined);
        }
        return updatedEdges;
      });
    },
    [setEdges, setNodes, setSelectedEdge, setSelectedNode],
  );

  const onConnectStart: OnConnectStart = useCallback(
    (_event, params) => {
      connectSourceNodeIdRef.current = params.nodeId;
    },
    [connectSourceNodeIdRef],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const { fromHandle, toHandle, fromNode } = connectionState;
      const sourceHandleId = fromHandle?.id ?? undefined;

      if (fromHandle && toHandle) {
        return;
      }

      if (isRelationshipSourceHandleId(sourceHandleId)) {
        return;
      }

      if (!fromNode) {
        return;
      }

      const { clientX: x, clientY: y } =
        'touches' in event ? event.touches[0] : event;

      const typedFromNode = fromNode as unknown as Node<AllNodeData>;
      const currentEdges = edgesRef.current;
      const currentNodes = nodesRef.current;

      if (isTemplateNode(typedFromNode)) {
        const templateSlots = getTemplateOutgoingSlots(
          typedFromNode.id,
          currentEdges,
          currentNodes,
        );
        if (fromHandle?.id === 'output') {
          if (templateSlots.hasOutput) {
            return;
          }
          handleAddOutputNode({ x, y, sourceHandleId });
          return;
        } else if (fromHandle?.id === 'parameters') {
          if (templateSlots.hasParameters) {
            return;
          }
          handleAddParametersNode({ x, y, node: typedFromNode, fromHandle });
          return;
        }
        if (templateSlots.hasStep) {
          return;
        }
        handleAddStepNode({ x, y, sourceHandleId });
        return;
      }

      const sourceEffectiveType = isPrefabNode(typedFromNode)
        ? (typedFromNode.data as any).refType || typedFromNode.type
        : typedFromNode.type;
      const sourceOutgoingCount = countOutgoingConnections(
        currentEdges,
        typedFromNode.id,
      );
      if (!hasOutgoingCapacity(sourceEffectiveType, sourceOutgoingCount)) {
        return;
      }

      if (isStepNode(typedFromNode)) {
        handleAddStepNode({ x, y, sourceHandleId });
        return;
      } else if (isPropertyNode(typedFromNode)) {
        handleAddPropertyNode({ x, y, sourceHandleId });
        return;
      } else if (isParametersNode(typedFromNode)) {
        handleAddParametersNode({ x, y, node: typedFromNode, fromHandle });
        return;
      } else if (isPrefabNode(typedFromNode)) {
        const refType = (typedFromNode.data as any).refType;

        if (refType === 'property' || refType === 'parameters') {
          handleAddPropertyNode({ x, y, sourceHandleId });
        } else {
          handleAddStepNode({ x, y, sourceHandleId });
        }
        return;
      }
    },
    [
      handleAddOutputNode,
      handleAddStepNode,
      handleAddParametersNode,
      handleAddPropertyNode,
    ],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');

      if (type === 'prefab') {
        const id = e.dataTransfer.getData('application/reactflow/id');
        const version =
          e.dataTransfer.getData('application/reactflow/version') || undefined;
        const refType = e.dataTransfer.getData('application/reactflow/refType');
        const currentNodes = nodesRef.current;

        if (id) {
          const position = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });

          let parentId: string | undefined;
          let relativePosition = position;
          let extent: 'parent' | undefined;
          let resolvedRefType: string | undefined = refType || undefined;
          let stepIdOverride: string | undefined;
          let stepNameOverride: string | undefined;

          try {
            const prefab = await loadPrefab(id, version);
            resolvedRefType = resolvedRefType || prefab.node.type;
            if (prefab.node.type === 'step') {
              stepIdOverride = getStepIdOverrideForPrefabInstance({
                baseStepId: (prefab.node.data as StepNodeData).stepId,
                nodes: currentNodes,
              });
              const stepOverrides = await promptForStepPrefabOverrides({
                stepId: stepIdOverride,
                name:
                  (prefab.node.data as StepNodeData).name?.trim() ||
                  (prefab.node.data as StepNodeData).stepId?.trim() ||
                  stepIdOverride,
              });

              if (!stepOverrides) {
                return;
              }

              stepIdOverride = stepOverrides.stepId;
              stepNameOverride = stepOverrides.name;
            }
          } catch {
            // Fall back to inserting the prefab instance without overrides.
          }

          // If it's a property prefab, check if dropped on a parameters node
          if (resolvedRefType === 'property') {
            const parentNode = currentNodes.find(
              n =>
                isParametersNode(n) &&
                position.x >= n.position.x &&
                position.x <=
                  n.position.x + (n.measured?.width ?? n.width ?? 0) &&
                position.y >= n.position.y &&
                position.y <=
                  n.position.y + (n.measured?.height ?? n.height ?? 0),
            );

            if (parentNode) {
              parentId = parentNode.id;
              extent = 'parent';
              relativePosition = {
                x: position.x - parentNode.position.x,
                y: position.y - parentNode.position.y,
              };
            }
          }

          const nodeId = uuidv4();
          setNodes(nds => [
            ...nds,
            {
              id: nodeId,
              type: 'prefab',
              name: '',
              position: relativePosition,
              parentId,
              extent,
              data: {
                id,
                type: 'prefab',
                version,
                refType: resolvedRefType,
                onChange,
                ...(stepIdOverride ? { stepIdOverride } : {}),
                ...(stepNameOverride ? { stepNameOverride } : {}),
              },
            },
          ]);
        }
      }
    },
    [
      loadPrefab,
      onChange,
      promptForStepPrefabOverrides,
      screenToFlowPosition,
      setNodes,
    ],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    onConnect,
    isValidConnection,
    handleNodesDelete,
    handleOnNodeClick,
    onNodeContextMenu,
    handleNodesChange,
    handleEdgesChange,
    handleOnEdgeClick,
    onConnectStart,
    onConnectEnd,
    handleDrop,
    onDragOver,
  };
};
