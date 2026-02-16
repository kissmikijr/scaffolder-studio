import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import {
    AllNodeData,
    isParametersNode,
    isPropertyNode,
    isPrefabNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

interface UseGroupDragDropProps {
    nodes: Node<AllNodeData>[];
    setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>;
}

export const useGroupDragDrop = ({ nodes, setNodes }: UseGroupDragDropProps) => {
    const onNodeDragStop = useCallback(
        (_: React.MouseEvent, node: Node<AllNodeData>) => {
            // Only allow Property or Prefab nodes to be grouped
            if (!isPropertyNode(node) && !isPrefabNode(node)) {
                return;
            }

            // If the node is already in a group, we typically skip re-grouping logic
            // unless we want to support moving between groups. 
            // For simplified "only drag in", we might even skip if it has a parentId?
            // But the user might want to drag from one group to another.
            // Let's safe-guard: if it has a parentId, we check if it is still inside THAT parent.
            // But simpler requirement: just "support dragging into the group".

            // Calculate absolute position of the dragged node for intersection check
            let nodeAbsolutePos = { x: node.position.x, y: node.position.y };
            const currentParent = nodes.find(n => n.id === node.parentId);

            if (currentParent) {
                nodeAbsolutePos = {
                    x: currentParent.position.x + node.position.x,
                    y: currentParent.position.y + node.position.y,
                };
            }

            // Find a group (ParametersNode) that intersects
            const targetGroup = nodes.find(n => {
                // Must be a ParametersNode and not the node itself
                if (!isParametersNode(n) || n.id === node.id) return false;

                // Use dimensions. Fallback if measured is missing.
                const groupWidth = n.measured?.width ?? n.width ?? 300;
                const groupHeight = n.measured?.height ?? n.height ?? 200;

                const nodeWidth = node.measured?.width ?? node.width ?? 150;
                const nodeHeight = node.measured?.height ?? node.height ?? 40;

                // Check AABB intersection
                const isOverlapping =
                    nodeAbsolutePos.x < n.position.x + groupWidth &&
                    nodeAbsolutePos.x + nodeWidth > n.position.x &&
                    nodeAbsolutePos.y < n.position.y + groupHeight &&
                    nodeAbsolutePos.y + nodeHeight > n.position.y;

                return isOverlapping;
            });

            // If we found a target group and the node is not already child of that group
            if (targetGroup && node.parentId !== targetGroup.id) {
                setNodes(nds => {
                    const otherNodes = nds.filter(n => n.id !== node.id);
                    const updatedNode = {
                        ...node,
                        parentId: targetGroup.id,
                        extent: 'parent' as const, // Constrain it to the parent
                        position: {
                            x: nodeAbsolutePos.x - targetGroup.position.x,
                            y: nodeAbsolutePos.y - targetGroup.position.y,
                        },
                    };
                    return [...otherNodes, updatedNode];
                });
            }

            // Explicitly NO "else" block -> we do not detach if dragged out.
        },
        [nodes, setNodes],
    );

    return { onNodeDragStop };
};
