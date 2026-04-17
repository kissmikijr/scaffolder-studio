import { createContext, useContext, useSyncExternalStore } from 'react';
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

const EMPTY_NODE_ISSUES: TemplateLintIssue[] = [];

export type TemplateLintIssuesStore = {
  getNodeIssues: (nodeId: string) => TemplateLintIssue[];
  setIssuesByNodeId: (issuesByNodeId: Map<string, TemplateLintIssue[]>) => void;
  subscribeNode: (nodeId: string, listener: () => void) => () => void;
};

export const createTemplateLintIssuesStore = (): TemplateLintIssuesStore => {
  let issuesByNodeId = new Map<string, TemplateLintIssue[]>();
  const listenersByNodeId = new Map<string, Set<() => void>>();

  const getListeners = (nodeId: string) => {
    const existing = listenersByNodeId.get(nodeId);
    if (existing) {
      return existing;
    }

    const next = new Set<() => void>();
    listenersByNodeId.set(nodeId, next);
    return next;
  };

  return {
    getNodeIssues: (nodeId: string) =>
      issuesByNodeId.get(nodeId) ?? EMPTY_NODE_ISSUES,
    setIssuesByNodeId: nextIssuesByNodeId => {
      const changedNodeIds = new Set<string>();

      for (const nodeId of issuesByNodeId.keys()) {
        if (issuesByNodeId.get(nodeId) !== nextIssuesByNodeId.get(nodeId)) {
          changedNodeIds.add(nodeId);
        }
      }

      for (const nodeId of nextIssuesByNodeId.keys()) {
        if (issuesByNodeId.get(nodeId) !== nextIssuesByNodeId.get(nodeId)) {
          changedNodeIds.add(nodeId);
        }
      }

      issuesByNodeId = nextIssuesByNodeId;

      for (const nodeId of changedNodeIds) {
        listenersByNodeId.get(nodeId)?.forEach(listener => listener());
      }
    },
    subscribeNode: (nodeId, listener) => {
      const listeners = getListeners(nodeId);
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersByNodeId.delete(nodeId);
        }
      };
    },
  };
};

export const TemplateLintContext = createContext<TemplateLintState>(
  EMPTY_TEMPLATE_LINT_STATE,
);

const EMPTY_TEMPLATE_LINT_ISSUES_STORE = createTemplateLintIssuesStore();

export const TemplateLintIssuesStoreContext =
  createContext<TemplateLintIssuesStore>(EMPTY_TEMPLATE_LINT_ISSUES_STORE);

export const useTemplateLintContext = (): TemplateLintState =>
  useContext(TemplateLintContext);

export const useNodeLintIssues = (nodeId: string): TemplateLintIssue[] => {
  const store = useContext(TemplateLintIssuesStoreContext);

  return useSyncExternalStore(
    listener => store.subscribeNode(nodeId, listener),
    () => store.getNodeIssues(nodeId),
    () => EMPTY_NODE_ISSUES,
  );
};
