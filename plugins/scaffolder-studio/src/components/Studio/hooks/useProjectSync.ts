import { useState, useEffect, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { useApi } from '@backstage/core-plugin-api';
import {
  AllNodeData,
  VisualTemplateProject,
  isTemplateNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { scaffolderVisualApiRef } from '../../../api/ScaffolderVisualClient';

interface UseProjectSyncProps {
  id: string | undefined;
  nodes: Node<AllNodeData>[];
  setViewportState: (viewport: { x: number; y: number; zoom: number }) => void;
}

export const useProjectSync = ({
  id,
  nodes,
  setViewportState,
}: UseProjectSyncProps) => {
  const api = useApi(scaffolderVisualApiRef);
  const [fetchedProject, setFetchedProject] =
    useState<VisualTemplateProject | null>(null);

  useEffect(() => {
    if (id) {
      api
        .getProject(id)
        .then(p => {
          setFetchedProject(p);
          setViewportState(p.viewport);
        })
        .catch(() => {
          // Ignore errors here, parent component handles redirect
        });
    }
  }, [api, id, setViewportState]);

  const project = useMemo(() => {
    if (!fetchedProject) return null;

    const templateNode = nodes.find(n => isTemplateNode(n));
    const templateName = (templateNode?.data?.name as string) || 'Untitled';

    if (fetchedProject.metadata.name !== templateName) {
      return {
        ...fetchedProject,
        metadata: {
          ...fetchedProject.metadata,
          name: templateName,
        },
      };
    }

    return fetchedProject;
  }, [nodes, fetchedProject]);

  return project;
};
