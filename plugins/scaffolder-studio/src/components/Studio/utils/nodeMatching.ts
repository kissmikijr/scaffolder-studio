import { Node, Edge } from '@xyflow/react';
import { AllNodeData, isTemplateNode, isParametersNode } from '../types';

export const mergeNodePositions = (
    oldNodes: Node<AllNodeData>[],
    oldEdges: Edge[],
    newNodes: Node<AllNodeData>[],
    newEdges: Edge[],
): Node<AllNodeData>[] => {
    const getOrder = (ns: Node<AllNodeData>[], es: Edge[]) => {
        const root = ns.find(n => isTemplateNode(n as any));
        if (!root) return ns; // Fallback to array order if no root

        const ordered: Node<AllNodeData>[] = [root];
        const visited = new Set<string>([root.id]);
        const queue = [root];

        while (queue.length > 0) {
            const current = queue.shift()!;
            // Find outgoing edges from current
            const outgoing = es.filter(e => e.source === current.id);

            const children: Node<AllNodeData>[] = [];

            for (const edge of outgoing) {
                const target = ns.find(n => n.id === edge.target);
                if (target && !visited.has(target.id)) {
                    // Avoid duplicates if multiple edges point to same target (unlikely but possible)
                    if (!children.some(c => c.id === target.id)) {
                        children.push(target);
                    }
                }
            }

            // Sort children to ensure deterministic order based on content (title > name > id)
            children.sort((a, b) => {
                const getVal = (n: Node<AllNodeData>) => {
                    const d = n.data as any;
                    return d?.title || d?.name || d?.id || n.id;
                };
                return String(getVal(a)).localeCompare(String(getVal(b)));
            });

            for (const child of children) {
                visited.add(child.id);
                ordered.push(child);
                queue.push(child);
            }
        }

        // Append any disconnected nodes (e.g. isolated groups) in their original array order
        const unvisited = ns.filter(n => !visited.has(n.id));
        return [...ordered, ...unvisited];
    };

    const oldOrdered = getOrder(oldNodes, oldEdges);
    const newOrdered = getOrder(newNodes, newEdges);

    return newNodes.map(newNode => {
        // Find the index of this node in the STRUCTURAL order of the new graph
        const newIndex = newOrdered.findIndex(n => n.id === newNode.id);

        // If we have a corresponding node at the same index in the OLD graph, take its position
        if (newIndex !== -1 && newIndex < oldOrdered.length) {
            const oldNode = oldOrdered[newIndex];
            // Ensure types match before merging properties to prevent applying dimensions to wrong node types
            if (oldNode.type === newNode.type) {
                return {
                    ...newNode,
                    position: oldNode.position,
                    width: oldNode.width,
                    height: oldNode.height,
                    measured: oldNode.measured,
                    style: oldNode.style,
                };
            }
        }
        if (isParametersNode(newNode as any)) {
            const children = newNodes.filter(n => n.parentId === newNode.id);

            // Defaults: ensures it's not squashed if no children found (e.g. data.parameters case) - 300x200
            let newWidth = 300;
            let newHeight = 200;

            if (children.length > 0) {
                let maxX = 0;
                let maxY = 0;

                // Defaults if dimensions are missing
                const DEFAULT_CHILD_WIDTH = 200;
                const DEFAULT_CHILD_HEIGHT = 100;

                children.forEach(child => {
                    const w = child.width ?? child.measured?.width ?? DEFAULT_CHILD_WIDTH;
                    const h = child.height ?? child.measured?.height ?? DEFAULT_CHILD_HEIGHT;
                    // Position is relative to parent
                    const x = child.position.x;
                    const y = child.position.y;

                    if (x + w > maxX) maxX = x + w;
                    if (y + h > maxY) maxY = y + h;
                });

                const PADDING = 20;
                const TITLE_HEIGHT = 40;
                const MIN_WIDTH = 300;
                const MIN_HEIGHT = 150;

                newWidth = Math.max(MIN_WIDTH, maxX + PADDING);
                newHeight = Math.max(MIN_HEIGHT, maxY + PADDING + TITLE_HEIGHT);
            }

            return {
                ...newNode,
                width: newWidth,
                height: newHeight,
                style: {
                    ...newNode.style,
                    width: newWidth,
                    height: newHeight,
                }
            };
        }

        return newNode;
    });
};
