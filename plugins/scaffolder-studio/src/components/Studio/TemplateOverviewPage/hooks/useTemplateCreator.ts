
import { useApi } from '@backstage/core-plugin-api';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { scaffolderVisualApiRef, ScaffolderStudioApi } from '../../../../api/ScaffolderVisualClient';

export const useTemplateCreator = () => {
    const api = useApi<ScaffolderStudioApi>(scaffolderVisualApiRef);
    const navigate = useNavigate();

    const createTemplate = async () => {
        const templateId = uuidv4();
        const templateNodeId = uuidv4();

        const sidebarWidth = Number(localStorage.getItem('scaffolderStudioRightSideContentWidth')) || 540;
        const availableWidth = window.innerWidth - sidebarWidth;
        const availableHeight = window.innerHeight;

        const nodeWidth = 260;
        const nodeHeight = 190;

        const x = Math.max(20, (availableWidth - nodeWidth) / 2);
        const y = Math.max(20, (availableHeight - nodeHeight) / 4);

        await api.create({
            id: templateId,
            nodes: [
                {
                    id: templateNodeId,
                    type: 'template',
                    position: { x: x - 70, y },
                    selected: true,
                    data: {
                        nodeType: 'template',
                        name: 'Untitled',
                        owner: '',
                        description: 'This is an example template',
                        annotations: {},
                        spec: { type: 'component' },
                        onChange: () => { },
                    },
                },
            ],
            edges: [],
            updated: new Date().toISOString(),
            published_at: null,
            viewport: {
                x: 0,
                y: 0,
                zoom: 1,
            },
            metadata: {
                name: 'New Template',
            },
            owner: 'system',
            deleted: false,
        });
        navigate(`/scaffolder-studio/templates/${templateId}/form`);
    };

    return { createTemplate };
};
