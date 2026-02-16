import { Node } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import {
    AllNodeData,
    PropertyNodeData,
    isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { getNodeBase } from '../nodeBase';

export const createPropertyNode = ({
    parentId,
    position,
    childCount,
    onChange,
}: {
    parentId: string;
    position: { x: number; y: number };
    childCount: number;
    onChange: (id: string, data: any) => void;
}): Node<PropertyNodeData> => {
    const baseNode = getNodeBase();
    const newNodeId = uuidv4();

    return {
        ...baseNode,
        id: newNodeId,
        type: 'property',
        selected: true,
        parentId: parentId,
        extent: 'parent',
        position,
        data: {
            name: `property${childCount + 1}`,
            variableType: 'string',
            onChange,
            'ui:field': '',
            'ui:options': '',
        },
    };
};

export const calculateParentParamsSize = (
    parentNode: Node<AllNodeData>,
    childPosition: { x: number; y: number },
    childSize = { width: 250, height: 100 },
    padding = 20,
) => {
    if (!isParametersNode(parentNode)) return parentNode;

    const parentWidth = parseFloat(String(parentNode.style?.width ?? parentNode.width ?? 300));
    const parentHeight = parseFloat(String(parentNode.style?.height ?? parentNode.height ?? 200));

    let newWidth = parentWidth;
    let newHeight = parentHeight;

    if (!isNaN(newWidth) && childPosition.x + childSize.width > newWidth) {
        newWidth = childPosition.x + childSize.width + padding;
    }

    if (!isNaN(newHeight) && childPosition.y + childSize.height > newHeight) {
        newHeight = childPosition.y + childSize.height + padding;
    }

    if (newWidth !== parentWidth || newHeight !== parentHeight) {
        return {
            ...parentNode,
            style: {
                ...parentNode.style,
                width: newWidth,
                height: newHeight,
            },
            width: newWidth,
            height: newHeight,
        };
    }

    return parentNode;
};
