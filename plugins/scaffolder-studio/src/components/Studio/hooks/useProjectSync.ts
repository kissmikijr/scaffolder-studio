import { useState, useEffect } from 'react';
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

export const useProjectSync = ({ id, nodes, setViewportState }: UseProjectSyncProps) => {
    const api = useApi(scaffolderVisualApiRef);
    const [project, setProject] = useState<VisualTemplateProject | null>(null);

    useEffect(() => {
        if (id) {
            api.getProject(id).then(p => {
                setProject(p);
                setViewportState(p.viewport);
            });
        }
    }, [api, id, setViewportState]);

    useEffect(() => {
        const templateNode = nodes.find(n => isTemplateNode(n));
        const templateName = (templateNode?.data?.name as string) || 'Untitled';

        if (project && project.metadata.name !== templateName) {
            setProject((prevProject: VisualTemplateProject | null) =>
                prevProject
                    ? {
                        ...prevProject,
                        metadata: {
                            ...prevProject.metadata,
                            name: templateName,
                        },
                    }
                    : null,
            );
        }
    }, [nodes, project]);

    return project;
};
