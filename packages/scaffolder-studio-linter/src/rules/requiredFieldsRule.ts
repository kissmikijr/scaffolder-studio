import {
  isStepNode,
  type ScaffolderAction,
  type StepNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { TemplateLintIssue, TemplateLintRule } from '../types';

const isMissingValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

const getRequiredInputKeys = (
  stepData: StepNodeData,
  actionById: Map<string, ScaffolderAction>,
): string[] => {
  const actionSchema = stepData.actionId
    ? actionById.get(stepData.actionId)?.schema?.input
    : undefined;
  const schemaInput = (actionSchema ?? (stepData.schema as any)?.input) as
    | { required?: string[] }
    | undefined;

  return Array.isArray(schemaInput?.required) ? schemaInput.required : [];
};

export const requiredFieldsRule: TemplateLintRule = {
  id: 'required-fields',
  run(context) {
    const issues: TemplateLintIssue[] = [];

    for (const node of context.snapshot.nodes) {
      if (!isStepNode(node)) {
        continue;
      }

      const stepData = node.data as StepNodeData;
      if (!stepData.stepId?.trim()) {
        issues.push({
          id: `${this.id}:${node.id}:stepId`,
          ruleId: this.id,
          code: 'missing-step-id',
          severity: 'warning',
          message: 'Step is missing an id.',
          nodeId: node.id,
          fieldPath: 'stepId',
        });
      }

      if (!stepData.name?.trim()) {
        issues.push({
          id: `${this.id}:${node.id}:name`,
          ruleId: this.id,
          code: 'missing-step-name',
          severity: 'warning',
          message: 'Step is missing a name.',
          nodeId: node.id,
          fieldPath: 'name',
        });
      }

      if (!stepData.actionId?.trim()) {
        issues.push({
          id: `${this.id}:${node.id}:actionId`,
          ruleId: this.id,
          code: 'missing-action-id',
          severity: 'warning',
          message: 'Step is missing an action id.',
          nodeId: node.id,
          fieldPath: 'actionId',
        });
      }

      for (const requiredKey of getRequiredInputKeys(
        stepData,
        context.actionById,
      )) {
        if (!isMissingValue(stepData.formData?.[requiredKey])) {
          continue;
        }

        issues.push({
          id: `${this.id}:${node.id}:input:${requiredKey}`,
          ruleId: this.id,
          code: 'missing-required-input',
          severity: 'warning',
          message: `Required input "${requiredKey}" is missing.`,
          nodeId: node.id,
          fieldPath: requiredKey,
        });
      }
    }

    return issues;
  },
};
