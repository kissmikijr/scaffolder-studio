import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ScaffolderVisualEditorEntityProvider } from './EntityProvider';
import { eventsServiceRef } from '@backstage/plugin-events-node';

export const catalogModuleScaffolderVisualEditorProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'scaffolder-studio-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        processing: catalogProcessingExtensionPoint,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        events: eventsServiceRef,
        auth: coreServices.auth,
      },
      async init({ logger, processing, discovery, scheduler, events, auth }) {
        const entityProvider = new ScaffolderVisualEditorEntityProvider(
          logger,
          discovery,
          scheduler,
          events,
          auth,
        );
        logger.info('Registering Scaffolder Visual Editor Entity Provider');
        processing.addEntityProvider(entityProvider);
      },
    });
  },
});
