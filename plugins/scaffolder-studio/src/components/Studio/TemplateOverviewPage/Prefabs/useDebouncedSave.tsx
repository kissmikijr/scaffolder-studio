import { useRef, useEffect, MutableRefObject } from 'react';
import debounce from 'lodash.debounce';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { useApi } from '@backstage/core-plugin-api';
import { Node } from '@xyflow/react';
import html2canvas from 'html2canvas';

type PrefabSaveState = {
  node: Node;
  title: string;
  description: string;
  id: string;
};

type UseDebouncedSaveProps = {
  projectId: string;
  state: PrefabSaveState;
  reactFlowWrapperRef: MutableRefObject<HTMLDivElement | null>;
};

export const useDebouncedSave = ({
  projectId,
  state,
  reactFlowWrapperRef,
}: UseDebouncedSaveProps) => {
  const prefabsApi = useApi(prefabsApiRef);

  const takeScreenshot = () => {
    if (reactFlowWrapperRef.current) {
      setTimeout(() => {
        if (reactFlowWrapperRef.current) {
          html2canvas(reactFlowWrapperRef.current, {
            scale: 0.5, // Scale down to 50% to reduce file size
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
                  `prefab-thumbnail-${projectId}`,
                  JSON.stringify(cacheData),
                );
              } catch {
                // Silent error
              }
            })
            .catch(_ => {
              // Silent error
            });
        }
      }, 1000);
    }
  };
  const debouncedSave = useRef(
    debounce(async (idToSave: string, data: PrefabSaveState) => {
      // Save to backend
      takeScreenshot();

      await prefabsApi.update({
        id: idToSave,
        node: data.node,
        title: data.title,
        description: data.description,
      } as any);
    }, 1000),
  ).current;

  useEffect(() => {
    if (projectId) {
      debouncedSave(projectId, state);
    }
  }, [state, projectId, debouncedSave]);
};
