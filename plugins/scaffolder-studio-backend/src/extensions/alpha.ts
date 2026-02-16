import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { PublisherExtension } from './types';

export interface ScaffolderVisualEditorPublisherExtensionPoint {
  addPublisher(publisher: PublisherExtension): void;
}

export const scaffolderVisualEditorPublisherExtensionPoint =
  createExtensionPoint<ScaffolderVisualEditorPublisherExtensionPoint>({
    id: 'scaffolder-studio/publisher',
  });
