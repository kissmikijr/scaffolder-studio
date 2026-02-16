import { createPermission } from '@backstage/plugin-permission-common';

export const visualScaffolderEditorPublishPermission = createPermission({
  name: 'visual-scaffolder-editor.publish',
  attributes: { action: 'create' },
});

export const visualScaffolderEditorUnpublishPermission = createPermission({
  name: 'visual-scaffolder-editor.unpublish',
  attributes: { action: 'delete' },
});

export const visualScaffolderEditorReadPermission = createPermission({
  name: 'visual-scaffolder-editor.read',
  attributes: { action: 'read' },
});

export const visualScaffolderEditorPrefabReadPermission = createPermission({
  name: 'visual-scaffolder-editor.prefab.read',
  attributes: { action: 'read' },
});

export const visualScaffolderEditorPrefabCreatePermission = createPermission({
  name: 'visual-scaffolder-editor.prefab.create',
  attributes: { action: 'create' },
});

export const visualScaffolderEditorPrefabDeletePermission = createPermission({
  name: 'visual-scaffolder-editor.prefab.delete',
  attributes: { action: 'delete' },
});
export const visualScaffolderEditorPermanentlyDeletePermission =
  createPermission({
    name: 'visual-scaffolder-editor.prefab.permanently-delete',
    attributes: { action: 'delete' },
  });
