import { isPropertyNode } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { TemplateLintRule } from '../types';

export const unusedParametersRule: TemplateLintRule = {
  id: 'unused-parameters',
  run(context) {
    const referencedNames = new Set(
      context.references
        .filter(reference => reference.kind === 'parameter')
        .map(reference => reference.sourceName),
    );

    return context.snapshot.nodes
      .filter(isPropertyNode)
      .filter(node => node.data.name && !referencedNames.has(node.data.name))
      .map(node => ({
        id: `${this.id}:${node.id}`,
        ruleId: this.id,
        code: 'unused-parameter',
        severity: 'warning' as const,
        message: `Parameter "${node.data.name}" is not referenced by any step.`,
        nodeId: node.id,
      }));
  },
};
