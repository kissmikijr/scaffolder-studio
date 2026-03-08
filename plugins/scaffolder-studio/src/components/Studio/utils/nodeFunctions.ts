import { Node } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import {
  AllNodeData,
  PropertyNodeData,
  isParametersNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { getNodeBase } from '../nodeBase';

const DEFAULT_PROPERTY_NAME_PREFIX = 'property';
const DEFAULT_PROPERTY_NAME_REGEX = /^property(\d+)$/;

export const getNextGlobalPropertyName = (nodes: Node<AllNodeData>[]) => {
  const usedNames = new Set<string>();
  let highestDefaultPropertySuffix = 0;

  nodes.forEach(node => {
    if (!isPropertyNode(node)) {
      return;
    }

    const propertyName = node.data.name?.trim();
    if (!propertyName) {
      return;
    }

    usedNames.add(propertyName);

    const match = propertyName.match(DEFAULT_PROPERTY_NAME_REGEX);
    if (!match) {
      return;
    }

    highestDefaultPropertySuffix = Math.max(
      highestDefaultPropertySuffix,
      Number(match[1]),
    );
  });

  let nextSuffix = highestDefaultPropertySuffix + 1;
  let candidateName = `${DEFAULT_PROPERTY_NAME_PREFIX}${nextSuffix}`;

  while (usedNames.has(candidateName)) {
    nextSuffix += 1;
    candidateName = `${DEFAULT_PROPERTY_NAME_PREFIX}${nextSuffix}`;
  }

  return candidateName;
};

export const createPropertyNode = ({
  parentId,
  position,
  name,
  onChange,
}: {
  parentId: string;
  position: { x: number; y: number };
  name: string;
  onChange: (id: string, data: any) => void;
}): Node<PropertyNodeData> => {
  const baseNode = getNodeBase();
  const newNodeId = uuidv4();

  return {
    ...baseNode,
    id: newNodeId,
    type: 'property',
    selected: true,
    parentId,
    extent: 'parent',
    position,
    data: {
      name,
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

  const parentWidth = parseFloat(
    String(parentNode.style?.width ?? parentNode.width ?? 300),
  );
  const parentHeight = parseFloat(
    String(parentNode.style?.height ?? parentNode.height ?? 200),
  );

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
