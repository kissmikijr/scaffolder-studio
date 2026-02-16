import { Node } from '@xyflow/react';
import { AllNodeData, isParametersNode } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export const ensureParametersNodeSizes = (nodes: Node<AllNodeData>[]): Node<AllNodeData>[] => {
    return nodes.map(node => {
        if (isParametersNode(node)) {
            const children = nodes.filter(n => n.parentId === node.id);

            // Default dimensions ensuring it's not squashed
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
            } else if (node.width && node.height) {
                // If it already has dimensions and no children found (maybe they are embedded in data?), keep them
                // But check against minimums
                newWidth = Math.max(Number(node.width), 300);
                newHeight = Math.max(Number(node.height), 200);
            }

            return {
                ...node,
                width: newWidth,
                height: newHeight,
                style: {
                    ...node.style,
                    width: newWidth,
                    height: newHeight,
                }
            };
        }
        return node;
    });
};
