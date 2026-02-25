import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import { rootRouteRef } from './routes.ts';
import {
  ApiBlueprint,
  createFrontendPlugin,
  NavItemBlueprint,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { convertLegacyRouteRefs } from '@backstage/core-compat-api';
import {
  prefabLibraryApiRef,
  PrefabLibraryClient,
  prefabsApiRef,
  PrefabsClient,
  scaffolderVisualApiRef,
  ScaffolderVisualClient,
} from './api';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { ScaffolderStudioPage } from './plugin.ts';
import { useEffect, useState } from 'react';
import { FormField } from '@backstage/plugin-scaffolder-react/alpha';
import { formFieldsApiRef } from '@backstage/plugin-scaffolder/alpha';

const NfsScaffolderStudioPage = () => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const formFieldsApi = useApi(formFieldsApiRef);

  useEffect(() => {
    if (formFieldsApi) {
      formFieldsApi
        .loadFormFields()
        .then(fields => setFormFields(fields))
        .catch(() => {});
    }
  }, [formFieldsApi]);

  return <ScaffolderStudioPage formFields={formFields} />;
};

const studioNavItem = NavItemBlueprint.make({
  params: {
    title: 'Scaffolder Studio',
    routeRef: rootRouteRef,
    icon: CreateComponentIcon,
  },
});

const studioPage = PageBlueprint.make({
  params: {
    path: '/scaffolder-studio',
    routeRef: rootRouteRef,
    loader: async () => {
      return <NfsScaffolderStudioPage />;
    },
  },
});

const visualApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: scaffolderVisualApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory({ discoveryApi, fetchApi }) {
        return new ScaffolderVisualClient(discoveryApi, fetchApi);
      },
    }),
});

const prefabsApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: prefabsApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory({ discoveryApi, fetchApi }) {
        return new PrefabsClient(discoveryApi, fetchApi);
      },
    }),
});

const prefabsLibraryApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: prefabLibraryApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory({ discoveryApi, fetchApi }) {
        return new PrefabLibraryClient({ discoveryApi, fetchApi });
      },
    }),
});

/**
 * Backstage frontend plugin.
 *
 * @alpha
 */
export default createFrontendPlugin({
  pluginId: 'scaffolder-studio',
  info: { packageJson: () => import('../package.json') },
  routes: convertLegacyRouteRefs({
    root: rootRouteRef,
  }),
  extensions: [
    studioNavItem,
    studioPage,
    visualApi,
    prefabsApi,
    prefabsLibraryApi,
  ],
});
