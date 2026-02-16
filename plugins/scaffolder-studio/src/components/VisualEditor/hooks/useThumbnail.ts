import { useRef, useCallback, useEffect, MutableRefObject } from 'react';
import debounce from 'lodash.debounce';
import html2canvas from 'html2canvas';

type UseThumbnailProps = {
    id?: string;
    reactFlowWrapper: MutableRefObject<HTMLDivElement | null>;
    nodes: any[];
    edges: any[];
    enabled?: boolean;
    storageKeyPrefix?: string;
};

export const useThumbnail = ({
    id,
    reactFlowWrapper,
    nodes,
    edges,
    enabled = true,
    storageKeyPrefix = 'project-thumbnail-',
}: UseThumbnailProps) => {
    const takeScreenshot = useCallback(() => {
        if (!id || !reactFlowWrapper.current || !enabled) {
            return;
        }

        const wrapper = reactFlowWrapper.current;

        // Small delay to ensure React Flow has finished rendering updates
        setTimeout(() => {
            html2canvas(wrapper, {
                scale: 0.4, // Keep it small to fit in localStorage
                logging: false,
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
                        localStorage.setItem(`${storageKeyPrefix}${id}`, JSON.stringify(cacheData));
                    } catch (error) {
                        console.error('Failed to save thumbnail to localStorage:', error);
                    }
                })
                .catch(error => {
                    console.error('Failed to create thumbnail canvas:', error);
                });
        }, 1000);
    }, [id, reactFlowWrapper, enabled]);

    const debouncedCapture = useRef(
        debounce(() => {
            takeScreenshot();
        }, 2000),
    ).current;

    useEffect(() => {
        if (enabled && id && (nodes.length > 0 || edges.length > 0)) {
            debouncedCapture();
        }
    }, [nodes, edges, id, enabled, debouncedCapture]);

    useEffect(() => {
        return () => {
            debouncedCapture.cancel();
        };
    }, [debouncedCapture]);
};
