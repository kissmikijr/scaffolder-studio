import { createPermission } from '@backstage/plugin-permission-common';

export const scaffolderStudioPublishPermission = createPermission({
  name: 'scaffolder-studio.publish',
  attributes: { action: 'create' },
});

export const scaffolderStudioUnpublishPermission = createPermission({
  name: 'scaffolder-studio.unpublish',
  attributes: { action: 'delete' },
});

export const scaffolderStudioReadPermission = createPermission({
  name: 'scaffolder-studio.read',
  attributes: { action: 'read' },
});

export const scaffolderStudioPrefabReadPermission = createPermission({
  name: 'scaffolder-studio.prefab.read',
  attributes: { action: 'read' },
});

export const scaffolderStudioPrefabCreatePermission = createPermission({
  name: 'scaffolder-studio.prefab.create',
  attributes: { action: 'create' },
});

export const scaffolderStudioPrefabDeletePermission = createPermission({
  name: 'scaffolder-studio.prefab.delete',
  attributes: { action: 'delete' },
});
export const scaffolderStudioPermanentlyDeletePermission =
  createPermission({
    name: 'scaffolder-studio.prefab.permanently-delete',
    attributes: { action: 'delete' },
  });
export const scaffolderStudioPrefabPublishPermission = createPermission({
  name: 'scaffolder-studio.prefab.publish',
  attributes: { action: 'update' },
});
