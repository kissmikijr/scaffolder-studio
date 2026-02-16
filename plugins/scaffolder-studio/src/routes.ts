import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'scaffolder-studio',
});

export const trashRouteRef = createSubRouteRef({
  id: 'scaffolder-studio/trash',
  parent: rootRouteRef,
  path: '/trash',
});

export const templatesRouteRef = createSubRouteRef({
  id: 'scaffolder-studio/templates',
  parent: rootRouteRef,
  path: '/templates',
});

export const publishedTemplatesRouteRef = createSubRouteRef({
  id: 'scaffolder-studio/published',
  parent: rootRouteRef,
  path: '/published',
});

export const prefabLibraryRouteRef = createSubRouteRef({
  id: 'scaffolder-studio/prefab-library',
  parent: rootRouteRef,
  path: '/prefab-library',
});

export const prefabsRouteRef = createSubRouteRef({
  id: 'scaffolder-studio/prefabs',
  parent: rootRouteRef,
  path: '/prefabs',
});

export const prefabEditorRouteRef = createRouteRef({
  id: 'scaffolder-studio/prefab',
  params: ['id'],
});

export const editorRouteRef = createRouteRef({
  id: 'scaffolder-studio/editor',
  params: ['id'],
});

export const dryRunRouteRef = createRouteRef({
  id: 'scaffolder-studio/dry-run',
  params: ['id'],
});
