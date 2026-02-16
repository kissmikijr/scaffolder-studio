import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { DefaultScaffolderAgent } from './agents/DefaultScaffolderAgent';
import { ScaffolderVisualEditorClient } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { scaffolderAgentExtensionPoint } from '@kissmiklosjr/plugin-scaffolder-studio-agent-node';

export const scaffolderVisualEditorAgentModuleQwen3 = createBackendModule({
  pluginId: 'scaffolder-studio-agent',
  moduleId: 'qwen3',
  register(reg) {
    reg.registerInit({
      deps: {
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        rootLifecycle: coreServices.rootLifecycle,
        scaffolderAgentExtensionPoint: scaffolderAgentExtensionPoint,
      },
      async init({
        auth,
        discovery,
        rootLifecycle,
        scaffolderAgentExtensionPoint,
      }) {
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: await auth.getOwnServiceCredentials(),
          targetPluginId: 'scaffolder-studio',
        });
        const visualEditorClient = new ScaffolderVisualEditorClient({
          discovery,
        });
        const actions = await visualEditorClient.getActions({ token });

        const abortController = new AbortController();

        const scaffolderAgent = new DefaultScaffolderAgent({
          actions,
          abortController,
          visualEditorClient,
          rootLifecycle,
        });

        scaffolderAgentExtensionPoint.setAgent(scaffolderAgent);
      },
    });
  },
});
