import React from 'react';
import {
    ScmIntegrationsApi,
    scmIntegrationsApiRef,
    ScmAuth,
} from '@backstage/integration-react';
import {
    configApiRef,
    createApiFactory,
} from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { createApp } from '@backstage/frontend-defaults';
import {
    ApiBlueprint,
    createFrontendModule,
    PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';

// Alpha plugin imports (new frontend system)
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import catalogImportPlugin from '@backstage/plugin-catalog-import/alpha';
import catalogGraphPlugin from '@backstage/plugin-catalog-graph/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import techdocsPlugin from '@backstage/plugin-techdocs/alpha';
import apiDocsPlugin from '@backstage/plugin-api-docs/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import orgPlugin from '@backstage/plugin-org/alpha';

// Scaffolder field extensions and custom plugins
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import {
    EntityNamePickerFieldExtension,
    EntityPickerFieldExtension,
    MultiEntityPickerFieldExtension,
    OwnerPickerFieldExtension,
    RepoUrlPickerFieldExtension,
    MyGroupsPickerFieldExtension,
    EntityTagsPickerFieldExtension,
    OwnedEntityPickerFieldExtension,
    RepoBranchPickerFieldExtension,
} from '@backstage/plugin-scaffolder';
import { ScaffolderVisualEditorPage } from '@kissmiklosjr/plugin-scaffolder-studio';
import { SelectFieldFromApiExtension } from '@roadiehq/plugin-scaffolder-frontend-module-http-request-field';

// Local imports
import { navModule } from './modules/nav';

// ============================================================================
// API Extensions
// ============================================================================

const scmIntegrationsApi = ApiBlueprint.make({
    name: 'scm-integrations',
    params: defineParams => defineParams(
        createApiFactory({
            api: scmIntegrationsApiRef,
            deps: { configApi: configApiRef },
            factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
        }),
    ),
});

const scmAuthApi = ApiBlueprint.make({
    name: 'scm-auth',
    params: defineParams => defineParams(
        ScmAuth.createDefaultApiFactory(),
    ),
});

// ============================================================================
// Sign-In Page Extension
// ============================================================================

const signInPage = SignInPageBlueprint.make({
    params: {
        loader: async () => props => (
            <SignInPage {...props} auto providers={['guest']} />
        ),
    },
});

// ============================================================================
// Scaffolder Visual Editor Page Extension
// ============================================================================

const visualEditorPage = PageBlueprint.make({
    params: {
        path: '/scaffolder-studio',
        loader: async () => (
            <ScaffolderVisualEditorPage>
                <ScaffolderFieldExtensions>
                    <SelectFieldFromApiExtension />
                    <EntityNamePickerFieldExtension />
                    <EntityPickerFieldExtension />
                    <MultiEntityPickerFieldExtension />
                    <OwnerPickerFieldExtension />
                    <RepoUrlPickerFieldExtension />
                    <MyGroupsPickerFieldExtension />
                    <EntityTagsPickerFieldExtension />
                    <OwnedEntityPickerFieldExtension />
                    <RepoBranchPickerFieldExtension />
                </ScaffolderFieldExtensions>
            </ScaffolderVisualEditorPage>
        ),
    },
});

// ============================================================================
// App Extensions Module
// ============================================================================

const appExtensionsModule = createFrontendModule({
    pluginId: 'app',
    extensions: [scmIntegrationsApi, scmAuthApi, signInPage, visualEditorPage],
});

// ============================================================================
// Create App - Fully migrated to new frontend system
// ============================================================================

const app = createApp({
    features: [
        // Core Backstage plugins (from /alpha exports)
        catalogPlugin,
        catalogImportPlugin,
        catalogGraphPlugin,
        scaffolderPlugin,
        techdocsPlugin,
        apiDocsPlugin,
        searchPlugin,
        userSettingsPlugin,
        orgPlugin,
        // Custom extensions
        appExtensionsModule,
        navModule,
    ],
});

export default app.createRoot();
