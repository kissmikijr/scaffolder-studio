import type { Edge, Node } from '@xyflow/react';
import type {
  AllNodeData,
  ScaffolderAction,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

export type TemplateLintSeverity = 'error' | 'warning' | 'info';

export type TemplateLintIssue = {
  id: string;
  ruleId: string;
  code: string;
  severity: TemplateLintSeverity;
  message: string;
  nodeId: string;
  fieldPath?: string;
  relatedNodeIds?: string[];
};

export type TemplateLintSummary = {
  errorCount: number;
  warningCount: number;
  infoCount: number;
};

export type TemplateLintResult = {
  issues: TemplateLintIssue[];
  summary: TemplateLintSummary;
  meta: {
    rulesVersion: string;
    generatedAt: string;
  };
};

export type TemplateLintNode = Node<AllNodeData>;
export type TemplateLintEdge = Edge;

export type TemplateLintRequest = {
  templateId?: string;
  nodes: TemplateLintNode[];
  edges: TemplateLintEdge[];
  options?: {
    includeRuleMetadata?: boolean;
  };
};

export type TemplateLintGraphSnapshot = {
  templateId?: string;
  nodes: TemplateLintNode[];
  edges: TemplateLintEdge[];
  options?: TemplateLintRequest['options'];
};

export type TemplateReference = {
  kind: 'parameter' | 'stepOutput';
  sourceNodeId?: string;
  sourceName: string;
  outputName?: string;
  targetNodeId: string;
  targetFieldPath: string;
  rawExpression: string;
};

export type TemplateLintContext = {
  snapshot: TemplateLintGraphSnapshot;
  nodeById: Map<string, TemplateLintNode>;
  propertyNodeByName: Map<string, TemplateLintNode>;
  stepNodeByStepId: Map<string, TemplateLintNode>;
  actionById: Map<string, ScaffolderAction>;
  references: TemplateReference[];
};

export type TemplateLintRule = {
  id: string;
  run(context: TemplateLintContext): TemplateLintIssue[];
};

export type TemplateLintOptions = {
  actions?: ScaffolderAction[];
  rules?: TemplateLintRule[];
  rulesVersion?: string;
  generatedAt?: string;
};
