import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import { configApiRef, createApiFactory } from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { createApp } from '@backstage/frontend-defaults';
import {
  ApiBlueprint,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
// Alpha plugin imports (new frontend system)
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';

import scaffolderStudioPlugin from '@kissmiklosjr/plugin-scaffolder-studio/alpha';

// ============================================================================
// API Extensions
// ============================================================================

const scmIntegrationsApi = ApiBlueprint.make({
  name: 'scm-integrations',
  params: defineParams =>
    defineParams(
      createApiFactory({
        api: scmIntegrationsApiRef,
        deps: { configApi: configApiRef },
        factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
      }),
    ),
});

const scmAuthApi = ApiBlueprint.make({
  name: 'scm-auth',
  params: defineParams => defineParams(ScmAuth.createDefaultApiFactory()),
});

// ============================================================================
// Sign-In Page Extension
// ============================================================================

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props =>
      <SignInPage {...props} auto providers={['guest']} />,
  },
});

// ============================================================================
// App Extensions Module
// ============================================================================

const appExtensionsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [scmIntegrationsApi, scmAuthApi, signInPage],
});

// ============================================================================
// Create App - Fully migrated to new frontend system
// ============================================================================

const app = createApp({
  features: [
    // Core Backstage plugins (from /alpha exports)
    scaffolderPlugin,
    searchPlugin,
    // Scaffolder Studio (alpha plugin)
    scaffolderStudioPlugin,
    // Custom extensions
    appExtensionsModule,
  ],
});

export default app.createRoot();
