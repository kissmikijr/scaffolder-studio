# Scaffolder Studio

Scaffolder Studio is a plugin for Backstage that allows you to create and edit Backstage templates in a visual way. It provides a dedicated user based space where you can create and trial via dry run your Scaffolder Templates. 

With Scaffolder Studio, you can:

- Create and edit your own Backstage templates in a visual way
- Trial your templates via an enhanced dry run UI
- Create your own Prefabs
- Publish prefabs to the Prefab Library
- Publish your template via the configured publisher

## Quick Start

Install the backstage plugins to your backstage instance:

Add the frontend plugin

```bash
yarn add @kissmiklosjr/plugin-scaffolder-studio
``` 

Add the backend plugin

```bash
yarn add @kissmiklosjr/plugin-scaffolder-studio-backend
```

### 2. Configure the Backend

In your `packages/backend/src/index.ts`, add the backend plugin:

```typescript
// packages/backend/src/index.ts

import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the scaffolder-studio backend
backend.add(import('@kissmiklosjr/plugin-scaffolder-studio-backend'));

backend.start();
```

### 3. Configure the Frontend

In your `packages/app/src/App.tsx`, add the route for the Studio. You should also register any custom field extensions you want to be available in the editor.

```tsx
// packages/app/src/App.tsx

import { ScaffolderStudioPage } from '@kissmiklosjr/plugin-scaffolder-studio';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import {
  EntityPickerFieldExtension,
  RepoUrlPickerFieldExtension,
  OwnerPickerFieldExtension,
  // ... other extensions
} from '@backstage/plugin-scaffolder';

// ...

const routes = (
  <FlatRoutes>
    {/* ... other routes */}

    <Route
      path="/scaffolder-studio/*"
      element={
        <ScaffolderStudioPage>
          {/* Register field extensions here so they appear in the editor */}
          <ScaffolderFieldExtensions>
            <EntityPickerFieldExtension />
            <RepoUrlPickerFieldExtension />
            <OwnerPickerFieldExtension />
          </ScaffolderFieldExtensions>
        </ScaffolderStudioPage>
      }
    />
  </FlatRoutes>
);
```

Add it to the sidebar

```typescript
// packages/app/src/components/Root/Root.tsx

import CreateComponentIcon from '@material-ui/icons/AddCircleOutline'; // or equivalent

// ...

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      {/* ... */}
      <SidebarItem icon={CreateComponentIcon} to="scaffolder-studio" text="Scaffolder Studio" />
      {/* ... */}
    </Sidebar>
  </SidebarPage>
);
```

#### Alpha Frontend (New Frontend System)

This project includes a frontend using the [new Backstage frontend system](https://backstage.io/docs/frontend-system/). The alpha frontend is available on a separate entry point.

- All plugins imported from `/alpha` subpaths (catalog, scaffolder, techdocs, etc.)


### 4. Add to Sidebar (Optional)

To make the editor easily accessible, you can add a link to the sidebar in `packages/app/src/components/Root/Root.tsx`:

```tsx
// packages/app/src/components/Root/Root.tsx

import CreateComponentIcon from '@material-ui/icons/AddCircleOutline'; // or equivalent

// ...

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      {/* ... */}
      <SidebarItem
        icon={CreateComponentIcon}
        to="scaffolder-studio"
        text="Studio"
      />
      {/* ... */}
    </Sidebar>
  </SidebarPage>
);
```
## Permissions

If you are using the Backstage Permission Framework, this plugin exports several permissions that you may need to configure in your permission policy.

Install the permission module into your backend
```typescript

import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the scaffolder-studio backend
backend.add(import('@kissmiklosjr/plugin-permission-backend-module-scaffolder-studio'));

backend.start();
```

Permission IDs exported by `@kissmiklosjr/plugin-scaffolder-studio-common`:

- `scaffolderStudioPublishPermission`
- `scaffolderStudioUnpublishPermission`
- `scaffolderStudioPrefabReadPermission`
- `scaffolderStudioPrefabCreatePermission`
- `scaffolderStudioPrefabDeletePermission`
- `scaffolderStudioPrefabPublishPermission`
- `scaffolderStudioPermanentlyDeletePermission`

Use these in your permission policy (e.g., `packages/backend/src/extensions/permissionsPolicyExtension.ts`) to control access.

## Publishers

To enable the event publisher you need to install the event based entity provider.

### Event based entity provider

```typescript

import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the scaffolder-studio backend
backend.add(import('@kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider'))
backend.start();
```
Then set enable it in your `app-config.yaml`

```yaml
scaffolder:
  studio:
    publishers:
      event:
        enabled: true
``` 
### Publishing to GitHub
To enable publshing to a GitHub repository you need to enable the GitHub publisher in your `app-config.yaml`

```yaml
scaffolder:
  studio:
    publishers:
      github:
        enabled: true
    prefabs:
      libraryEnabled: true # Set to false to disable the prefab library feature
```

## Key Concepts

### Templates

You can create templates. These are going to be fully functional Backstage Scaffolder templates. The templates that you create are yours only, others cannot access these. The template creation is done in a visual way. 

You can start by creating a new template. In the editor you add Step, Parameters, Property and Output nodes to construct a full Backstage Scaffolder Template.

The nodes are connected to each other to create a template which gets serialized into the yaml representation the node's position in the graph determines its position in the yaml file.

If you have created a template you can run Dry Run to test it out and iterate on it. 

The templates are auto-saved to localstorage and synced to the backend on an interval. 

If you have a publisher configured in your app-config.yaml file and you are happy with your template you can publish it to the Backstage Scaffolder backend. If you do not have a publisher configured you can still create and edit templates but you will need to manually copy the yaml representation to ingest it into your Backstage instance.

Permissions to control the publishing of templates:
- `scaffolderStudioPublishPermission`
- `scaffolderStudioUnpublishPermission`

### Prefabs

Prefabs are atomic Step, Output or Property nodes that you can reuse across multiple templates. The prefabs that you create are yours only if you want to make it avaialble to everyone you can publish them into the Prefab Library.

You can create prefabs via the prefab tab. You can create a new prefab by clicking the "New Prefab" button. You can then select Step, Output or Property nodes. 
Once you are happy with your prefab you can publish it to the Prefab Library. You can then use the prefab in your templates by dragging and dropping it from the prefab library to the template editor.

The prefabs are going to be serialized int noneditable yaml blocks in the yaml view.

A published prefab will be available in the Prefab Library for all users of your Backstage instance. You can also unpublish a prefab to make it unavailable to others.

These permissions control the prefabs:
- `scaffolderStudioPrefabReadPermission`
- `scaffolderStudioPrefabCreatePermission`
- `scaffolderStudioPrefabDeletePermission`
- `scaffolderStudioPrefabPublishPermission`
