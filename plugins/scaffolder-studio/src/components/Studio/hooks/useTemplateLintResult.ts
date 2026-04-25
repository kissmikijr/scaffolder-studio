import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type {
  TemplateLintIssue,
  TemplateLintResult,
} from '@kissmiklosjr/scaffolder-studio-linter';
import type { ScaffolderStudioApi } from '../../../api/ScaffolderVisualClient';
import { toGraphContentHash } from '../utils/templateContentHash';

type UseTemplateLintResultOptions = {
  api: ScaffolderStudioApi;
  templateId?: string;
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  enabled?: boolean;
  debounceMs?: number;
};

export type UseTemplateLintResultValue = {
  result: TemplateLintResult | null;
  issuesByNodeId: Map<string, TemplateLintIssue[]>;
  isLoading: boolean;
  error: Error | null;
};

const toLintRequestError = (nextError: unknown) =>
  nextError instanceof Error ? nextError : new Error('Failed to lint template');

const groupIssuesByNodeId = (issues: TemplateLintIssue[]) => {
  const issuesByNodeId = new Map<string, TemplateLintIssue[]>();

  for (const issue of issues) {
    const existing = issuesByNodeId.get(issue.nodeId) ?? [];
    existing.push(issue);
    issuesByNodeId.set(issue.nodeId, existing);
  }

  return issuesByNodeId;
};

const areIssueArraysEqual = (
  previousIssues: TemplateLintIssue[] | undefined,
  nextIssues: TemplateLintIssue[] | undefined,
) => {
  if (previousIssues === nextIssues) {
    return true;
  }

  if (!previousIssues || !nextIssues) {
    return false;
  }

  if (previousIssues.length !== nextIssues.length) {
    return false;
  }

  for (let index = 0; index < previousIssues.length; index += 1) {
    const previousIssue = previousIssues[index];
    const nextIssue = nextIssues[index];

    if (
      previousIssue.id !== nextIssue.id ||
      previousIssue.nodeId !== nextIssue.nodeId ||
      previousIssue.severity !== nextIssue.severity ||
      previousIssue.message !== nextIssue.message
    ) {
      return false;
    }
  }

  return true;
};

export const useTemplateLintResult = ({
  api,
  templateId,
  nodes,
  edges,
  enabled = true,
  debounceMs = 450,
}: UseTemplateLintResultOptions): UseTemplateLintResultValue => {
  const [result, setResult] = useState<TemplateLintResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestSequenceRef = useRef(0);
  const previousIssuesByNodeIdRef = useRef<Map<string, TemplateLintIssue[]>>(
    new Map(),
  );
  const latestNodesRef = useRef(nodes);
  const latestEdgesRef = useRef(edges);

  latestNodesRef.current = nodes;
  latestEdgesRef.current = edges;

  const contentHash = useMemo(
    () => toGraphContentHash(nodes, edges),
    [nodes, edges],
  );

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    startTransition(() => {
      setError(null);
      setIsLoading(true);
    });
    const timeoutId = window.setTimeout(() => {
      void api
        .lintTemplate({
          templateId,
          nodes: latestNodesRef.current,
          edges: latestEdgesRef.current,
        })
        .then(nextResult => {
          if (requestSequenceRef.current !== requestSequence) {
            return;
          }

          startTransition(() => {
            setResult(nextResult);
            setError(null);
          });
        })
        .catch(nextError => {
          if (requestSequenceRef.current !== requestSequence) {
            return;
          }

          startTransition(() => {
            setError(toLintRequestError(nextError));
          });
        })
        .finally(() => {
          if (requestSequenceRef.current === requestSequence) {
            startTransition(() => {
              setIsLoading(false);
            });
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [api, contentHash, debounceMs, enabled, templateId]);

  const issuesByNodeId = useMemo(() => {
    const nextIssuesByNodeId = groupIssuesByNodeId(result?.issues ?? []);
    const previousIssuesByNodeId = previousIssuesByNodeIdRef.current;
    const mergedIssuesByNodeId = new Map<string, TemplateLintIssue[]>();
    const nodeIds = new Set<string>([
      ...previousIssuesByNodeId.keys(),
      ...nextIssuesByNodeId.keys(),
    ]);

    for (const nodeId of nodeIds) {
      const previousIssues = previousIssuesByNodeId.get(nodeId);
      const nextIssues = nextIssuesByNodeId.get(nodeId);

      if (!nextIssues || nextIssues.length === 0) {
        continue;
      }

      mergedIssuesByNodeId.set(
        nodeId,
        areIssueArraysEqual(previousIssues, nextIssues)
          ? (previousIssues as TemplateLintIssue[])
          : nextIssues,
      );
    }

    previousIssuesByNodeIdRef.current = mergedIssuesByNodeId;
    return mergedIssuesByNodeId;
  }, [result]);

  return {
    result,
    issuesByNodeId,
    isLoading,
    error,
  };
};
