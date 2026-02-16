import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import {
  prefabsRouteRef,
  rootRouteRef,
  templatesRouteRef,
  publishedTemplatesRouteRef,
  prefabLibraryRouteRef,
  trashRouteRef,
} from './routes';

import {
  scaffolderVisualApiRef,
  ScaffolderVisualClient,
} from './api/ScaffolderVisualClient';

import { discoveryApiRef } from '@backstage/core-plugin-api';
import { prefabsApiRef, PrefabsClient } from './api/PrefabsClient';
import {
  prefabLibraryApiRef,
  PrefabLibraryClient,
} from './api/PrefabLibraryClient';

export const editorPlugin = createPlugin({
  id: 'scaffolder-studio',
  routes: {
    root: rootRouteRef,
    trash: trashRouteRef,
    templates: templatesRouteRef,
    published: publishedTemplatesRouteRef,
    prefabLibrary: prefabLibraryRouteRef,
    prefabs: prefabsRouteRef,
  },
  apis: [
    createApiFactory({
      api: scaffolderVisualApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new ScaffolderVisualClient(discoveryApi, fetchApi),
    }),
    createApiFactory({
      api: prefabsApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new PrefabsClient(discoveryApi, fetchApi),
    }),
    createApiFactory({
      api: prefabLibraryApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new PrefabLibraryClient({ discoveryApi, fetchApi }),
    }),
  ],
});

export const ScaffolderStudioPage = editorPlugin.provide(
  createRoutableExtension({
    name: 'ScaffolderStudioPage',
    component: () => {
      return import('./components/Router/Router').then(m => m.Router);
    },
    mountPoint: rootRouteRef,
  }),
);
