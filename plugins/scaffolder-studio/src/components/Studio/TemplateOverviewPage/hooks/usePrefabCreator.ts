
import { useApi } from '@backstage/core-plugin-api';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { prefabsApiRef, PrefabsClientApi } from '../../../../api/PrefabsClient';

export const usePrefabCreator = () => {
    const prefabsApi = useApi<PrefabsClientApi>(prefabsApiRef);
    const navigate = useNavigate();

    const createPrefab = async () => {
        const { id: prefabId } = await prefabsApi.create({
            node: {
                id: uuidv4(),
                type: 'step',
                position: { x: 0, y: 0 },
                data: {
                    type: 'step',
                    name: '',
                    stepId: '',
                    if: '',
                    actionId: '',
                    description: '',
                    schema: null,
                    formData: {},
                },
            },
            title: 'New Prefab',
        });
        navigate(`/scaffolder-studio/prefab/${prefabId}`);
    };

    return { createPrefab };
};
