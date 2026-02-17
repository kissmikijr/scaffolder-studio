import {
  AllNodeData,
  isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Node } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

export const rehydrateNodes = (
  nodes: Node<AllNodeData>[],
  handlers: {
    onChange: (id: string, newData: any) => void;
    onAddProperty: (parentId: string) => void;
  },
): Node<AllNodeData>[] => {
  return nodes.flatMap(node => {
    if (!node.data) return [node];

    const hydratedNode = {
      ...node,
      data: {
        ...node.data,
        onChange: handlers.onChange,
        ...(isParametersNode(node) ? { onAddProperty: handlers.onAddProperty } : {}),
      },
    };

    if (isParametersNode(hydratedNode) && hydratedNode.data.parameters && hydratedNode.data.parameters.length > 0) {
      const { parameters, ...restData } = hydratedNode.data;

      // Calculate height based on children
      const childrenCount = parameters.length;
      const height = 80 + childrenCount * 80;

      const groupNode = {
        ...hydratedNode,
        style: { ...hydratedNode.style, width: 300, height },
        data: {
          ...restData,
          parameters: [], // Clear parameters
          title: hydratedNode.data.title || 'Parameters',
          onChange: handlers.onChange,
          onAddProperty: handlers.onAddProperty,
        },
      };

      const children = parameters.map((param, index) => ({
        id: uuidv4(),
        type: 'property',
        parentId: groupNode.id,
        extent: 'parent',
        position: { x: 20, y: 60 + index * 70 },
        data: {
          name: param.name,
          variableType: param.type,
          required: param.required,
          onChange: handlers.onChange,
        },
      }));

      return [groupNode, ...children] as Node<AllNodeData>[];
    }

    return [hydratedNode];
  });
};
