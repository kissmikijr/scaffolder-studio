import { useRef, useEffect, MutableRefObject } from 'react';
import debounce from 'lodash.debounce';
import { scaffolderVisualApiRef } from '../../api/ScaffolderVisualClient';
import { useApi } from '@backstage/core-plugin-api';
import { Node, Edge } from '@xyflow/react';
import html2canvas from 'html2canvas';

type SaveState = {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    name: string;
  };
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
};

type UseDebouncedSaveProps = {
  projectId: string;
  state: SaveState;
  reactFlowWrapper: MutableRefObject<HTMLDivElement | null>;
  enabled?: boolean;
};

export const useDebouncedSave = ({
  projectId,
  state,
  reactFlowWrapper,
  enabled = true,
}: UseDebouncedSaveProps) => {
  const templatesApi = useApi(scaffolderVisualApiRef);

  const takeScreenshot = () => {
    if (reactFlowWrapper.current) {
      setTimeout(() => {
        if (reactFlowWrapper.current) {
          html2canvas(reactFlowWrapper.current, {
            scale: 0.4, // Scale down to 50% to reduce file size
            logging: false, // Disable logging to reduce noise
            useCORS: true,
            allowTaint: true,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
          })
            .then(canvas => {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

              const cacheData = {
                dataUrl,
                version: Date.now(),
              };

              try {
                localStorage.setItem(
                  `project-thumbnail-${projectId}`,
                  JSON.stringify(cacheData),
                );
              } catch (error) {
                console.error('Failed to save to localStorage:', error);
              }
            })
            .catch(error => {
              console.error('Failed to create canvas:', error);
            });
        }
      }, 1000);
    }
  };
  const debouncedSave = useRef(
    debounce(async (projectId: string, data: SaveState) => {
      // Save to backend
      takeScreenshot();

      // Prefer node name, then existing metadata name, then fallback.
      const templateNode = data.nodes.find(n => n.type === 'template');
      const templateName =
        (templateNode?.data?.name as string | undefined) ||
        data.metadata?.name ||
        'Untitled';

      await templatesApi.update({
        id: projectId,
        nodes: data.nodes,
        edges: data.edges,
        viewport: data.viewport,
        updated: new Date().toISOString(),
        published_at: null,
        metadata: {
          name: templateName,
        },
      } as any);
    }, 1000),
  ).current;

  useEffect(() => {
    if (enabled && projectId) {
      debouncedSave(projectId, state);
    }
  }, [state, projectId, enabled, debouncedSave]);
};
