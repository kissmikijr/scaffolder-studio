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
  onChange: (id: string, data: any) => void;
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
  onChange,
}: UseEditorHandlersProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const nodesRef = useRef(nodes);
  const blockedEdgeRemovalIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

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

  const isValidConnection = useCallback<IsValidConnection<Edge>>(
    connectionOrEdge => {
      const { source, target } = connectionOrEdge;
      if (!source || !target || source === target) {
        return false;
      }

      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
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

      const sourceOutgoingCount = countOutgoingConnections(edges, source);
      const targetIncomingCount = countIncomingConnections(edges, target);

      if (!hasIncomingCapacity(targetEffectiveType, targetIncomingCount)) {
        return false;
      }

      if (isTemplateNode(sourceNode)) {
        const templateSlots = getTemplateOutgoingSlots(source, edges, nodes);
        return (
          (targetEffectiveType === 'step' && !templateSlots.hasStep) ||
          (targetEffectiveType === 'parameters' && !templateSlots.hasParameters) ||
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
          targetEffectiveType === 'parameters' || targetEffectiveType === 'property'
        );
      }

      if (sourceEffectiveType === 'property') {
        return targetEffectiveType === 'property';
      }

      return false;
    },
    [edges, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge(connection, eds));
    },
    [setEdges],
  );

  const handleNodesDelete = useCallback(
    (deletedNodes: Node<AllNodeData>[]) => {
      const deletableNodes = deletedNodes.filter(node => !isTemplateNode(node));
      if (deletableNodes.length === 0) {
        return;
      }

      setNodes(nds => {
        const remainingNodes = nds.filter(
          n => !deletableNodes.some(dn => dn.id === n.id),
        );

        deletableNodes.forEach(deletedNode => {
          const nodeId = deletedNode.id;
          const incomingEdges = edges.filter(e => e.target === nodeId);
          const outgoingEdges = edges.filter(e => e.source === nodeId);
          const parentIds = incomingEdges.map(e => e.source);
          const childIds = outgoingEdges.map(e => e.target);

          const newEdges = parentIds.flatMap(parentId =>
            childIds.map(childId => ({
              id: `${parentId}-${childId}`,
              source: parentId,
              target: childId,
            })),
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
    [edges, setNodes, setEdges],
  );
  const handleOnNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<AllNodeData>) => {
      if (node) {
        setSelectedNode(node);
        handleTabChange('form');
      }
    },
    [setSelectedNode, handleTabChange],
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
      const blockedTemplateRemovalIds = changes
        .filter(change => change.type === 'remove')
        .map(change => change.id)
        .filter(id => {
          const node = nodes.find(n => n.id === id);
          return Boolean(node && isTemplateNode(node));
        });

      if (blockedTemplateRemovalIds.length > 0) {
        blockedEdgeRemovalIdsRef.current = new Set(
          edges
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
        const node = nodes.find(n => n.id === change.id);
        return !node || !isTemplateNode(node);
      });

      if (isShiftPressed) {
        processedChanges = processedChanges.map(change => {
          if (change.type === 'position' && change.position) {
            const node = nodes.find(n => n.id === change.id);
            if (node) {
              const connectedEdges = edges.filter(
                e => e.source === node.id || e.target === node.id,
              );

              if (connectedEdges.length > 0) {
                const edge = connectedEdges[0];
                const isSource = edge.source === node.id;
                const connectedNodeId = isSource ? edge.target : edge.source;
                const connectedNode = nodes.find(n => n.id === connectedNodeId);

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
                    connectedNode.measured?.width ??
                    connectedNode.width ??
                    150;

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
    [setNodes, isShiftPressed, nodes, edges],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const blockedIds = blockedEdgeRemovalIdsRef.current;
      const filteredChanges = changes.filter(change => {
        if (change.type !== 'remove') return true;
        return !blockedIds.has(change.id);
      });

      blockedEdgeRemovalIdsRef.current = new Set();
      setEdges(eds => applyEdgeChanges(filteredChanges, eds));
    },
    [setEdges],
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

      if (!fromNode) {
        return;
      }

      const { clientX: x, clientY: y } =
        'touches' in event ? event.touches[0] : event;

      const typedFromNode = fromNode as unknown as Node<AllNodeData>;

      if (isTemplateNode(typedFromNode)) {
        if (fromHandle?.id === 'output') {
          handleAddOutputNode({ x, y, sourceHandleId });
          return;
        } else if (fromHandle?.id === 'parameters') {
          handleAddParametersNode({ x, y, node: typedFromNode, fromHandle });
          return;
        }
        handleAddStepNode({ x, y, sourceHandleId });
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
    }, [
    handleAddOutputNode,
    handleAddStepNode,
    handleAddParametersNode,
    handleAddPropertyNode,
  ]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');

      if (type === 'prefab') {
        const id = e.dataTransfer.getData('application/reactflow/id');
        const version = e.dataTransfer.getData('application/reactflow/version');
        const refType = e.dataTransfer.getData('application/reactflow/refType');

        if (id) {
          const position = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });

          let parentId: string | undefined;
          let relativePosition = position;
          let extent: 'parent' | undefined;

          // If it's a property prefab, check if dropped on a parameters node
          if (refType === 'property') {
            const parentNode = nodes.find(
              n =>
                isParametersNode(n) &&
                position.x >= n.position.x &&
                position.x <= n.position.x + (n.measured?.width ?? n.width ?? 0) &&
                position.y >= n.position.y &&
                position.y <= n.position.y + (n.measured?.height ?? n.height ?? 0)
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
              data: { id, type: 'prefab', version, refType, onChange },
            },
          ]);
        }
      }
    },
    [screenToFlowPosition, setNodes, onChange, nodes],
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
    onConnectStart,
    onConnectEnd,
    handleDrop,
    onDragOver,
  };
};
