import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';
import { Prefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { prefabsApiRef } from '../../../api/PrefabsClient';
import { prefabLibraryApiRef } from '../../../api/PrefabLibraryClient';

type UsePrefabDataOptions = {
  prefabId?: string;
  version?: string;
  enabled?: boolean;
};

export const usePrefabData = ({
  prefabId,
  version,
  enabled = true,
}: UsePrefabDataOptions) => {
  const personalApi = useApi(prefabsApiRef);
  const libraryApi = useApi(prefabLibraryApiRef);

  return useQuery<Prefab>({
    queryKey: ['prefab', prefabId, version],
    enabled: enabled && Boolean(prefabId),
    queryFn: async () => {
      if (!prefabId) {
        throw new Error('Missing prefab ID');
      }

      // Unversioned refs can point to unpublished personal prefabs.
      if (!version) {
        try {
          const personalPrefab = await personalApi.get({ id: prefabId });
          if (personalPrefab) {
            return personalPrefab as Prefab;
          }
        } catch {
          // Fall through to library lookup.
        }
      }

      return libraryApi.get(prefabId, version);
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
