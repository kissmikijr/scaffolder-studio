import { createBackendFeatureLoader } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';

export default createBackendFeatureLoader({
  deps: {
    config: coreServices.rootConfig,
  },
  *loader({ config }) {
    yield import('./plugin');
    if (
      config.getOptionalBoolean('scaffolder.studio.publishers.github.enabled')
    ) {
      yield import('./modules/githubPublisherModule');
    }
    if (
      config.getOptionalBoolean('scaffolder.studio.publishers.event.enabled')
    ) {
      yield import('./modules/eventPublisherModule');
    }

    yield import(
      '@kissmiklosjr/plugin-permission-backend-module-scaffolder-studio'
    );

    yield import(
      '@kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider'
    );
  },
});

export { ScaffolderStudioClient } from './clients/ScaffolderStudioClient';
export { default as scaffolderStudioPlugin } from './plugin';
export { githubPublisherModule } from './modules/githubPublisherModule';
export { eventPublisherModule } from './modules/eventPublisherModule';
export { scaffolderStudioPublisherExtensionPoint } from './extensions/alpha';
export type { ScaffolderStudioPublisherExtensionPoint } from './extensions/alpha';
