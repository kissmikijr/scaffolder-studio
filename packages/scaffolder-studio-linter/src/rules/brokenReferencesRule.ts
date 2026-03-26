import {
  isStepNode,
  type StepNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { TemplateLintIssue, TemplateLintRule } from '../types';

const hasOutputProperty = (stepNode: any, outputName: string): boolean => {
  const outputProperties = ((stepNode.data as StepNodeData).schema as any)
    ?.output?.properties as Record<string, unknown> | undefined;

  if (!outputProperties) {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(outputProperties, outputName);
};

export const brokenReferencesRule: TemplateLintRule = {
  id: 'broken-references',
  run(context) {
    const issues: TemplateLintIssue[] = [];

    for (const reference of context.references) {
      if (reference.kind === 'parameter') {
        if (context.propertyNodeByName.has(reference.sourceName)) {
          continue;
        }

        issues.push({
          id: `${this.id}:${reference.targetNodeId}:${reference.targetFieldPath}:parameter:${reference.sourceName}`,
          ruleId: this.id,
          code: 'unknown-parameter',
          severity: 'error',
          message: `Unknown parameter "${reference.sourceName}" referenced in "${reference.targetFieldPath}".`,
          nodeId: reference.targetNodeId,
          fieldPath: reference.targetFieldPath,
        });
        continue;
      }

      const stepNode = context.stepNodeByStepId.get(reference.sourceName);
      if (!stepNode || !isStepNode(stepNode)) {
        issues.push({
          id: `${this.id}:${reference.targetNodeId}:${reference.targetFieldPath}:step:${reference.sourceName}`,
          ruleId: this.id,
          code: 'unknown-step',
          severity: 'error',
          message: `Unknown step "${reference.sourceName}" referenced in "${reference.targetFieldPath}".`,
          nodeId: reference.targetNodeId,
          fieldPath: reference.targetFieldPath,
        });
        continue;
      }

      if (
        !reference.outputName ||
        hasOutputProperty(stepNode, reference.outputName)
      ) {
        continue;
      }

      issues.push({
        id: `${this.id}:${reference.targetNodeId}:${reference.targetFieldPath}:output:${reference.sourceName}:${reference.outputName}`,
        ruleId: this.id,
        code: 'unknown-step-output',
        severity: 'error',
        message: `Unknown output "${reference.outputName}" on step "${reference.sourceName}".`,
        nodeId: reference.targetNodeId,
        fieldPath: reference.targetFieldPath,
        relatedNodeIds: [stepNode.id],
      });
    }

    return issues;
  },
};
