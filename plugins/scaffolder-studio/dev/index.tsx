import { createDevApp } from '@backstage/dev-utils';
import { editorPlugin } from '../src/plugin';
import {
  scaffolderApiRef,
  ScaffolderApi,
} from '@backstage/plugin-scaffolder-react';
import { ScaffolderClient } from '@backstage/plugin-scaffolder';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import { CatalogClient } from '@backstage/catalog-client';
import {
  formDecoratorsApiRef,
  formFieldsApiRef,
} from '@backstage/plugin-scaffolder/alpha';
import { DefaultScaffolderFormDecoratorsApi } from '@backstage/plugin-scaffolder/alpha';

createDevApp()
  .registerPlugin(editorPlugin)

  .registerApi({
    api: scaffolderApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      scmIntegrationsApi: scmIntegrationsApiRef,
      fetchApi: fetchApiRef,
      identityApi: identityApiRef,
    },
    factory: ({ discoveryApi, scmIntegrationsApi, fetchApi, identityApi }) =>
      new ScaffolderClient({
        discoveryApi,
        scmIntegrationsApi: scmIntegrationsApi as any,
        fetchApi,
        identityApi,
      }) as unknown as ScaffolderApi,
  })
  .registerApi({
    api: formDecoratorsApiRef,
    deps: {},
    factory: () => DefaultScaffolderFormDecoratorsApi.create(),
  })
  .registerApi({
    api: formFieldsApiRef,
    deps: {},
    factory: () => ({ getFormFields: async () => [] }),
  })
  .registerApi({
    api: catalogApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
    },
    factory: ({ discoveryApi, fetchApi }) =>
      new CatalogClient({
        discoveryApi,
        fetchApi,
      }),
  })

  .render();
