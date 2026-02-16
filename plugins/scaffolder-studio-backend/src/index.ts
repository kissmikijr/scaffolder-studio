import { createBackendFeatureLoader } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';

export default createBackendFeatureLoader({
  deps: {
    config: coreServices.rootConfig,
  },
  *loader({ config }) {
    yield import('./plugin');
    if (
      config.getOptionalBoolean('scaffolder.visualEditor.publishers.github.enabled')
    ) {
      yield import('./modules/githubPublisherModule');
    }
    if (
      config.getOptionalBoolean('scaffolder.visualEditor.publishers.event.enabled')
    ) {
      yield import('./modules/eventPublisherModule');
    }
    // yield import('@kissmiklosjr/plugin-scaffolder-studio-agent-backend');

    // yield import(
    //   '@kissmiklosjr/plugin-permission-backend-module-visual-scaffolder-editor'
    // );

    yield import(
      '@kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider'
    );
  },
});

export { default as scaffolderVisualEditorPlugin } from './plugin';
export { githubPublisherModule } from './modules/githubPublisherModule';
export { eventPublisherModule } from './modules/eventPublisherModule';
export { scaffolderVisualEditorPublisherExtensionPoint } from './extensions/alpha';
export type { ScaffolderVisualEditorPublisherExtensionPoint } from './extensions/alpha';
