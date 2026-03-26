import {
  isPropertyNode,
  isStepNode,
  type ScaffolderAction,
  type StepNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type {
  TemplateLintContext,
  TemplateLintGraphSnapshot,
  TemplateReference,
} from './types';
import { findReferenceTokens } from './tokenParser';

const FILTER_ONLY_SUFFIX_REGEX =
  /^\s*(?:\|\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\([^()]*\))?\s*)*$/;

const collectBareParameterReferences = ({
  value,
  topLevelFieldPath,
  targetNodeId,
  references,
  propertyNodeByName,
}: {
  value: string;
  topLevelFieldPath: string;
  targetNodeId: string;
  references: TemplateReference[];
  propertyNodeByName: Map<string, any>;
}) => {
  const trimmedValue = value.trim();
  if (
    !trimmedValue ||
    trimmedValue.includes('parameters.') ||
    trimmedValue.includes('steps')
  ) {
    return;
  }

  for (const [propertyName, propertyNode] of propertyNodeByName.entries()) {
    if (!trimmedValue.startsWith(propertyName)) {
      continue;
    }

    const suffix = trimmedValue.slice(propertyName.length);
    if (!FILTER_ONLY_SUFFIX_REGEX.test(suffix)) {
      continue;
    }

    references.push({
      kind: 'parameter',
      sourceName: propertyName,
      sourceNodeId: propertyNode?.id,
      targetNodeId,
      targetFieldPath: topLevelFieldPath,
      rawExpression: trimmedValue,
    });
    return;
  }
};

const collectReferencesFromValue = (
  value: unknown,
  topLevelFieldPath: string,
  targetNodeId: string,
  references: TemplateReference[],
  propertyNodeByName: Map<string, any>,
  stepNodeByStepId: Map<string, any>,
) => {
  if (typeof value === 'string') {
    const parsedTokens = findReferenceTokens(value);
    for (const token of parsedTokens) {
      if (token.type === 'parameter' && token.paramName) {
        references.push({
          kind: 'parameter',
          sourceName: token.paramName,
          sourceNodeId: propertyNodeByName.get(token.paramName)?.id,
          targetNodeId,
          targetFieldPath: topLevelFieldPath,
          rawExpression: token.fullExpression,
        });
      } else if (token.type === 'step' && token.stepId && token.outputName) {
        references.push({
          kind: 'stepOutput',
          sourceName: token.stepId,
          sourceNodeId: stepNodeByStepId.get(token.stepId)?.id,
          outputName: token.outputName,
          targetNodeId,
          targetFieldPath: topLevelFieldPath,
          rawExpression: token.fullExpression,
        });
      }
    }

    if (parsedTokens.length === 0) {
      collectBareParameterReferences({
        value,
        topLevelFieldPath,
        targetNodeId,
        references,
        propertyNodeByName,
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item =>
      collectReferencesFromValue(
        item,
        topLevelFieldPath,
        targetNodeId,
        references,
        propertyNodeByName,
        stepNodeByStepId,
      ),
    );
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(item =>
      collectReferencesFromValue(
        item,
        topLevelFieldPath,
        targetNodeId,
        references,
        propertyNodeByName,
        stepNodeByStepId,
      ),
    );
  }
};

export const createTemplateLintContext = (
  snapshot: TemplateLintGraphSnapshot,
  { actions = [] }: { actions?: ScaffolderAction[] } = {},
): TemplateLintContext => {
  const nodeById = new Map(snapshot.nodes.map(node => [node.id, node]));
  const propertyNodeByName = new Map<string, any>();
  const stepNodeByStepId = new Map<string, any>();
  const actionById = new Map(actions.map(action => [action.id, action]));

  for (const node of snapshot.nodes) {
    if (isPropertyNode(node) && node.data.name) {
      propertyNodeByName.set(node.data.name, node);
    } else if (isStepNode(node) && node.data.stepId) {
      stepNodeByStepId.set(node.data.stepId, node);
    }
  }

  const references: TemplateReference[] = [];

  for (const node of snapshot.nodes) {
    if (!isStepNode(node)) {
      continue;
    }

    const stepData = node.data as StepNodeData;
    if (stepData.if) {
      collectReferencesFromValue(
        stepData.if,
        'if',
        node.id,
        references,
        propertyNodeByName,
        stepNodeByStepId,
      );
    }

    for (const [fieldPath, fieldValue] of Object.entries(
      stepData.formData ?? {},
    )) {
      collectReferencesFromValue(
        fieldValue,
        fieldPath,
        node.id,
        references,
        propertyNodeByName,
        stepNodeByStepId,
      );
    }
  }

  return {
    snapshot,
    nodeById,
    propertyNodeByName,
    stepNodeByStepId,
    actionById,
    references,
  };
};
