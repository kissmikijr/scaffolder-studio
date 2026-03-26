import { createContext, useContext } from 'react';
import type {
  TemplateLintIssue,
  TemplateLintResult,
} from '@kissmiklosjr/scaffolder-studio-linter';

export type TemplateLintState = {
  result: TemplateLintResult | null;
  issuesByNodeId: Map<string, TemplateLintIssue[]>;
  isLoading: boolean;
  error: Error | null;
};

const EMPTY_TEMPLATE_LINT_STATE: TemplateLintState = {
  result: null,
  issuesByNodeId: new Map(),
  isLoading: false,
  error: null,
};

export const TemplateLintContext = createContext<TemplateLintState>(
  EMPTY_TEMPLATE_LINT_STATE,
);

export const useTemplateLintContext = (): TemplateLintState =>
  useContext(TemplateLintContext);
