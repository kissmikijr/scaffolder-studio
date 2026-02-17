import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { PublisherExtension } from './types';

export interface ScaffolderStudioPublisherExtensionPoint {
  addPublisher(publisher: PublisherExtension): void;
}

export const scaffolderStudioPublisherExtensionPoint =
  createExtensionPoint<ScaffolderStudioPublisherExtensionPoint>({
    id: 'scaffolder-studio/publisher',
  });
