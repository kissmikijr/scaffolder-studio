# Scaffolder Studio

> [!WARNING]
> This version of Scaffolder Studio requires **Backstage version 1.48.0** or newer.

> [!IMPORTANT]
> This plugin uses **MUI v5**. If your Backstage instance is still on MUI v4, you may encounter styling issues or conflicts. It is recommended to use this plugin with a Backstage instance that has been migrated to MUI v5.

Scaffolder Studio is a plugin for Backstage that allows you to create and edit Backstage templates in a visual way. It provides a dedicated user based space where you can create and trial via dry run your Scaffolder Templates.

<img width="1726" height="856" alt="image" src="https://github.com/user-attachments/assets/e1bf1984-588e-4671-8703-65b44e725d49" />

Video walkthrough:

- [https://www.youtube.com/watch?v=urf1mC9XnUE](https://www.youtube.com/watch?v=urf1mC9XnUE)

With Scaffolder Studio, you can:

- Create and edit your own Backstage templates in a visual way
- Trial your templates via an enhanced dry run UI
- Create your own Prefabs
- Publish prefabs to the Prefab Library
- Publish your template via the configured publisher

## Table of Contents

- [Quick Start](#quick-start)
  - [2. Configure the Backend](#2-configure-the-backend)
  - [3. Configure the Frontend](#3-configure-the-frontend)
    - [Alpha Frontend (New Frontend System)](#alpha-frontend-new-frontend-system)
  - [4. Add to Sidebar (Optional)](#4-add-to-sidebar-optional)
- [Key Concepts](#key-concepts)
  - [Templates](#templates)
  - [Prefabs](#prefabs)
  - [Comments](#comments)
  - [Linting](#linting)
- [Shortcuts](#shortcuts)
- [Permissions](#permissions)
- [Publishers](#publishers)
  - [Event based entity provider](#event-based-entity-provider)
  - [Publishing to GitHub](#publishing-to-github)
- [Troubleshooting](#troubleshooting)

## Quick Start

Install the backstage plugins to your backstage instance:

Add the frontend plugin

```bash
yarn workspace app add @kissmiklosjr/plugin-scaffolder-studio
```

Add the backend plugin

```bash
yarn workspace backend add @kissmiklosjr/plugin-scaffolder-studio-backend
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
      <SidebarItem
        icon={CreateComponentIcon}
        to="scaffolder-studio"
        text="Scaffolder Studio"
      />
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

### Comments

The comment feature allows you to add persist comments to your Step, property, output and template nodes. You can add or edit a comment by hovering over the node's top-right corner and clicking the comment icon. The comment will be saved to the node's data.

The intended use of comments is to provide additional context or notes about the configuration of that element. It can be especially usful to document a complex scm action configuration.

### Linting

Scaffolder Studio runs backend-powered lint checks against the current in-memory graph while you edit. Linting is debounced and keyed off semantic graph changes, so panning, zooming, selection changes, and node dragging do not retrigger lint work on their own.

Linting is enabled by default. If you need to turn it off for your Backstage instance, disable it in `app-config.yaml`:

```yaml
scaffolder:
  studio:
    lint:
      enabled: false
```

This setting is instance-wide and applies to both the editor UI and backend lint responses.

Current default lint rules:

- `required-fields`: warns when a step is missing an id, name, action id, or required action inputs
- `broken-references`: errors on references to unknown parameters, steps, or step outputs
- `unused-parameters`: warns when a parameter is defined but never referenced
- `dangling-edges`: warns when a property-to-step connection does not match any inferred dependency

Lint issues are surfaced directly on nodes via badges and tooltips. Save, sync, and publish still use backend validation as the authoritative check.

## Shortcuts

Scaffolder Studio supports the following shortcuts:

| Shortcut                                                      | Action                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `1`                                                           | Add Step node                                                      |
| `2`                                                           | Add Parameters node                                                |
| `3`                                                           | Add Property node (when a Parameters/Property context is selected) |
| `4`                                                           | Add Output node                                                    |
| `0`                                                           | Fit view                                                           |
| `Cmd/Ctrl + 0`                                                | Fit view                                                           |
| `Cmd/Ctrl + 4`                                                | Toggle relationship edges                                          |
| `Option + Cmd + B` (macOS) / `Alt + Ctrl + B` (Windows/Linux) | Toggle right side panel                                            |
| `Cmd/Ctrl + C`                                                | Copy selected node (non-template nodes)                            |
| `Cmd/Ctrl + V`                                                | Paste copied node                                                  |
| `Cmd/Ctrl + Z`                                                | Undo                                                               |
| `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y`                      | Redo                                                               |
| `j`                                                           | Select next node (sorted top-to-bottom, then left-to-right)        |
| `k`                                                           | Select previous node (sorted top-to-bottom, then left-to-right)    |
| Hold `Shift` while dragging a node                            | Snap alignment against connected nodes                             |
| Hold `Space` while dragging                                   | Pan the canvas                                                     |

Shortcuts are ignored while typing in input, textarea, select, or other editable fields.

## Permissions

If you are using the Backstage Permission Framework, this plugin exports several permissions that you may need to configure in your permission policy.

Install the permission module into your backend

```bash
yarn workspace backend add @kissmiklosjr/plugin-permission-backend-module-scaffolder-studio
```

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the scaffolder-studio backend
backend.add(
  import('@kissmiklosjr/plugin-permission-backend-module-scaffolder-studio'),
);

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

```bash
yarn workspace backend add @kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider
```

### Event based entity provider

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the scaffolder-studio backend
backend.add(
  import(
    '@kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider'
  ),
);
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

## Troubleshooting

If there are not scaffolder field extensions showing up in the property node's select ui:field option list, you need to register them in your `packages/app/src/App.tsx` file. See the "Configure the Frontend" section above for more information.
