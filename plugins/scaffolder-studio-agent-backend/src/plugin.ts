import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { scaffolderAgentServiceRef } from './service/ScaffolderAgentService';
import {
  scaffolderAgentExtensionPoint,
  ScaffolderAgentInterface,
} from '@kissmiklosjr/plugin-scaffolder-studio-agent-node';

/**
 * scaffolderVisualEditorAgentPlugin backend plugin
 *
 * @public
 */
export const scaffolderStudioAgentPlugin = createBackendPlugin({
  pluginId: 'scaffolder-studio-agent',
  register(env) {
    let scaffolderAgent: ScaffolderAgentInterface;
    env.registerExtensionPoint(scaffolderAgentExtensionPoint, {
      setAgent(agent) {
        scaffolderAgent = agent;
      },
    });
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
        discovery: coreServices.discovery,
        scaffolderAgentService: scaffolderAgentServiceRef,
        rootLifecycle: coreServices.rootLifecycle,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
      },
      async init({ httpRouter, scaffolderAgentService, auth, httpAuth }) {
        if (!scaffolderAgent) {
          throw new Error(
            'Scaffolder agent not found make sure to register an agent',
          );
        }

        const router = await createRouter({
          scaffolderAgent,
          scaffolderAgentService,
          httpAuth,
          auth,
        });
        httpRouter.use(router);
      },
    });
  },
});
