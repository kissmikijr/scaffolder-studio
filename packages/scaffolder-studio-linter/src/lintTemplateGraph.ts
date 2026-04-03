import type {
  TemplateLintGraphSnapshot,
  TemplateLintOptions,
  TemplateLintResult,
  TemplateLintRule,
  TemplateLintSummary,
} from './types';
import { createTemplateLintContext } from './dependencyAnalysis';
import {
  brokenReferencesRule,
  danglingEdgesRule,
  requiredFieldsRule,
  unusedParametersRule,
} from './rules';

export const builtinRules: TemplateLintRule[] = [
  unusedParametersRule,
  brokenReferencesRule,
  danglingEdgesRule,
  requiredFieldsRule,
];

const summarizeIssues = (
  issueSeverities: TemplateLintResult['issues'],
): TemplateLintSummary => ({
  errorCount: issueSeverities.filter(issue => issue.severity === 'error')
    .length,
  warningCount: issueSeverities.filter(issue => issue.severity === 'warning')
    .length,
  infoCount: issueSeverities.filter(issue => issue.severity === 'info').length,
});

export const lintTemplateGraph = (
  snapshot: TemplateLintGraphSnapshot,
  options: TemplateLintOptions = {},
): TemplateLintResult => {
  const context = createTemplateLintContext(snapshot, {
    actions: options.actions,
  });
  const rules = options.rules ?? builtinRules;
  const issues = rules
    .flatMap(rule => rule.run(context))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    issues,
    summary: summarizeIssues(issues),
    meta: {
      rulesVersion: options.rulesVersion ?? '1',
      generatedAt: options.generatedAt ?? new Date().toISOString(),
    },
  };
};
