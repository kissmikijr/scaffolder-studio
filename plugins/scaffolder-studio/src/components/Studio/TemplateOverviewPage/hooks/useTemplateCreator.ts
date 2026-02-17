
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
        await api.create({
            id: templateId,
            nodes: [
                {
                    id: templateNodeId,
                    type: 'template',
                    position: { x: 100, y: 100 },
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
