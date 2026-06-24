import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import { rootRouteRef } from './routes.ts';
import {
  ApiBlueprint,
  createFrontendPlugin,
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
import { Router } from './components/Router/Router';
import { useEffect, useState } from 'react';
import { FormField } from '@backstage/plugin-scaffolder-react/alpha';
import { formFieldsApiRef } from '@backstage/plugin-scaffolder/alpha';

const NfsScaffolderStudioPage = () => {
  const [formFields, setFormFields] = useState<FormField[] | null>(null);
  const formFieldsApi = useApi(formFieldsApiRef);

  useEffect(() => {
    if (formFieldsApi) {
      formFieldsApi
        .loadFormFields()
        .then(fields => setFormFields(fields))
        .catch(() => setFormFields([]));
    } else {
      setFormFields([]);
    }
  }, [formFieldsApi]);

  if (formFields === null) {
    return null;
  }

  return <Router formFields={formFields} />;
};

const studioPage = PageBlueprint.make({
  params: {
    title: 'Scaffolder Studio',
    icon: <CreateComponentIcon fontSize="inherit" />,
    path: '/scaffolder-studio',
    routeRef: rootRouteRef,
    noHeader: true,
    loader: async () => {
      return <NfsScaffolderStudioPage />;
    },
  },
});

const visualApi = ApiBlueprint.make({
  name: 'visual',
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
  name: 'prefabs',
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
  name: 'prefabs-library',
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
  extensions: [studioPage, visualApi, prefabsApi, prefabsLibraryApi],
});
