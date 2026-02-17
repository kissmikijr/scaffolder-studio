import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { eventsServiceRef } from '@backstage/plugin-events-node';
import { scaffolderStudioPublisherExtensionPoint } from '../extensions/alpha';
import { EventPublisherExtension } from '../extensions/EventPublisherExtension';

export const eventPublisherModule = createBackendModule({
  pluginId: 'scaffolder-studio',
  moduleId: 'event-publisher',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        events: eventsServiceRef,
        publisherExtensionPoint: scaffolderStudioPublisherExtensionPoint,
      },
      async init({ events, publisherExtensionPoint }) {
        publisherExtensionPoint.addPublisher(new EventPublisherExtension(events));
      },
    });
  },
});

export default eventPublisherModule;
