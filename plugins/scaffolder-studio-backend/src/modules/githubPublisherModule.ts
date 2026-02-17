import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import { GithubPublisher } from '../extensions/GithubPublisher';
import { scaffolderStudioPublisherExtensionPoint } from '../extensions/alpha';

export const githubPublisherModule = createBackendModule({
  pluginId: 'scaffolder-studio',
  moduleId: 'github-publisher',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        publisherExtensionPoint: scaffolderStudioPublisherExtensionPoint,
      },
      async init({ config, publisherExtensionPoint }) {
        const scmIntegrations = ScmIntegrations.fromConfig(config);
        publisherExtensionPoint.addPublisher(
          new GithubPublisher(scmIntegrations),
        );
      },
    });
  },
});

export default githubPublisherModule;
