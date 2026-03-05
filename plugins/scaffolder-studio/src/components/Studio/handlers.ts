import {
  Prefab,
  PrefabNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Node } from '@xyflow/react';
import {
  AllNodeData,
  StepNodeData,
  StepRelationshipRef,
  isPropertyNode,
  isStepNode,
} from './types';

const replaceAllTokens = (
  value: string,
  previousToken: string,
  nextToken: string,
) => {
  if (!previousToken || previousToken === nextToken) {
    return value;
  }
  return value.split(previousToken).join(nextToken);
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceParameterReferenceToken = ({
  value,
  previousPropertyName,
  nextPropertyName,
  previousToken,
}: {
  value: string;
  previousPropertyName: string;
  nextPropertyName: string;
  previousToken?: string;
}): string => {
  const nextToken = `\${{ parameters.${nextPropertyName} }}`;
  const exactReplaced = previousToken
    ? replaceAllTokens(value, previousToken, nextToken)
    : value;
  if (exactReplaced !== value) {
    return exactReplaced;
  }

  const oldName = escapeRegExp(previousPropertyName);
  const wrappedWithOptionalFilterPattern = new RegExp(
    `\\$\\{\\{\\s*parameters\\.${oldName}(\\s*\\|[^}]*)?\\s*\\}\\}`,
    'g',
  );

  const wrappedReplaced = value.replace(
    wrappedWithOptionalFilterPattern,
    (_fullMatch, filterPart = '') =>
      `\${{ parameters.${nextPropertyName}${String(filterPart).trimEnd()} }}`,
  );
  if (wrappedReplaced !== value) {
    return wrappedReplaced;
  }

  // Legacy raw token form from expression-token nodes without wrapper.
  const rawPattern = new RegExp(
    `^\\s*parameters\\.${oldName}(\\s*\\|.*)?\\s*$`,
    'g',
  );
  if (rawPattern.test(value)) {
    return value.replace(
      new RegExp(`parameters\\.${oldName}`),
      `parameters.${nextPropertyName}`,
    );
  }

  return value;
};

const replaceParameterReferencesInValue = ({
  value,
  previousPropertyName,
  nextPropertyName,
  previousToken,
}: {
  value: unknown;
  previousPropertyName: string;
  nextPropertyName: string;
  previousToken?: string;
}): { value: unknown; changed: boolean } => {
  if (typeof value === 'string') {
    const replaced = replaceParameterReferenceToken({
      value,
      previousPropertyName,
      nextPropertyName,
      previousToken,
    });
    return { value: replaced, changed: replaced !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const nextArray = value.map(item => {
      const next = replaceParameterReferencesInValue({
        value: item,
        previousPropertyName,
        nextPropertyName,
        previousToken,
      });
      if (next.changed) {
        changed = true;
      }
      return next.value;
    });
    return { value: changed ? nextArray : value, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const nextRecord: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const next = replaceParameterReferencesInValue({
        value: nestedValue,
        previousPropertyName,
        nextPropertyName,
        previousToken,
      });
      nextRecord[key] = next.value;
      if (next.changed) {
        changed = true;
      }
    }
    return { value: changed ? nextRecord : value, changed };
  }

  return { value, changed: false };
};

const syncPropertyRenameForStep = ({
  node,
  propertyNodeId,
  previousPropertyName,
  nextPropertyName,
}: {
  node: Node<AllNodeData>;
  propertyNodeId: string;
  previousPropertyName: string;
  nextPropertyName: string;
}): Node<AllNodeData> => {
  if (!isStepNode(node)) {
    return node;
  }

  const stepData = node.data as StepNodeData;
  const refs = Array.isArray(stepData.relationshipRefs)
    ? stepData.relationshipRefs
    : [];

  let nextIf = stepData.if;
  const nextFormData =
    stepData.formData && typeof stepData.formData === 'object'
      ? { ...stepData.formData }
      : {};
  let touchedText = false;
  let touchedRefs = false;
  let matchedPropertyRefs = 0;

  const nextRefs = refs.map(ref => {
    if (
      ref.sourceKind !== 'property' ||
      ref.sourceNodeId !== propertyNodeId ||
      !ref.targetField
    ) {
      return ref;
    }
    matchedPropertyRefs += 1;

    const previousToken =
      ref.lastRenderedToken || `\${{ parameters.${previousPropertyName} }}`;
    const nextToken = `\${{ parameters.${nextPropertyName} }}`;

    if (ref.targetField === 'if') {
      if (typeof nextIf === 'string') {
        const replaced = replaceParameterReferenceToken({
          value: nextIf,
          previousPropertyName,
          nextPropertyName,
          previousToken,
        });
        if (replaced !== nextIf) {
          nextIf = replaced;
          touchedText = true;
        }
      }
    } else {
      const currentValue = nextFormData[ref.targetField];
      const nextValue = replaceParameterReferencesInValue({
        value: currentValue,
        previousPropertyName,
        nextPropertyName,
        previousToken,
      });
      if (nextValue.changed) {
        nextFormData[ref.targetField] = nextValue.value;
        touchedText = true;
      }
    }

    if (ref.lastRenderedToken !== nextToken) {
      touchedRefs = true;
      return {
        ...ref,
        lastRenderedToken: nextToken,
      } satisfies StepRelationshipRef;
    }

    return ref;
  });

  // Backward compatibility: update legacy templates that do not yet carry relationship refs.
  if (matchedPropertyRefs === 0) {
    if (typeof nextIf === 'string') {
      const replaced = replaceParameterReferenceToken({
        value: nextIf,
        previousPropertyName,
        nextPropertyName,
      });
      if (replaced !== nextIf) {
        nextIf = replaced;
        touchedText = true;
      }
    }

    for (const [key, rawValue] of Object.entries(nextFormData)) {
      const replaced = replaceParameterReferencesInValue({
        value: rawValue,
        previousPropertyName,
        nextPropertyName,
      });
      if (replaced.changed) {
        nextFormData[key] = replaced.value;
        touchedText = true;
      }
    }
  }

  if (!touchedText && !touchedRefs) {
    return node;
  }

  return {
    ...node,
    data: {
      ...stepData,
      if: nextIf,
      formData: nextFormData,
      relationshipRefs: nextRefs,
    },
  };
};

export const onChange =
  (setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>) =>
  (nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds: Node<AllNodeData>[]) => {
      const sourceNodeBeforeUpdate = nds.find(n => n.id === nodeId);
      const nextNodes = nds.map(n =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, ...data } as AllNodeData,
            }
          : n,
      );

      if (!sourceNodeBeforeUpdate || !isPropertyNode(sourceNodeBeforeUpdate)) {
        return nextNodes;
      }

      const previousPropertyName = sourceNodeBeforeUpdate.data.name;
      const nextPropertyName = data.name;

      if (
        typeof previousPropertyName !== 'string' ||
        typeof nextPropertyName !== 'string' ||
        previousPropertyName === nextPropertyName
      ) {
        return nextNodes;
      }

      return nextNodes.map(node =>
        syncPropertyRenameForStep({
          node,
          propertyNodeId: nodeId,
          previousPropertyName,
          nextPropertyName,
        }),
      );
    });
  };

export const onChangePrefab =
  (setPrefab: React.Dispatch<React.SetStateAction<Prefab>>) =>
  (_nodeId: string, data: PrefabNodeData) => {
    setPrefab((prev: Prefab) => {
      if (!prev || !prev.node) return prev;

      // Check if the data actually changed to avoid unnecessary updates
      const newNodeData = { ...prev.node.data, ...data };
      const hasChanged =
        JSON.stringify(prev.node.data) !== JSON.stringify(newNodeData);

      if (!hasChanged) return prev;

      return {
        ...prev,
        node: {
          ...prev.node,
          ...newNodeData,
          data: newNodeData,
        },
      };
    });
  };
