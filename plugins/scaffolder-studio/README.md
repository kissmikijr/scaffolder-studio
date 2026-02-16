# Scaffolder Studio Plugin

The Scaffolder Studio plugin provides a visual interface for creating and editing Backstage Scaffolder templates. It offers a drag-and-drop experience for defining template parameters and steps, making it easier for developers to build and maintain software templates.

## Features

- **Studio**: Drag-and-drop interface for composing Scaffolder templates.
- **Form Preview**: Real-time preview of the template form as you build it.
- **YAML Support**: Bi-directional syncing between the Studio and the underlying YAML definition.
- **Prefab Support**: Create and reuse components (prefabs) across multiple templates.
- **Backend Integration**: Seamless integration with the Backstage Scaffolder backend.

## Installation

### Prerequisites

- Backstage version `1.44` or newer (supporting the New Backend System).
- The `scaffolder` plugin must be installed and configured in your Backstage instance.

### 1. Install the packages

From the root of your Backstage repository, install the frontend and backend packages:

```bash
# Install frontend plugin
yarn add @kissmiklosjr/plugin-scaffolder-studio

# Install backend plugin
yarn --cwd packages/backend add @kissmiklosjr/plugin-scaffolder-studio-backend

# Install common package (required for permissions)
yarn --cwd packages/backend add @kissmiklosjr/plugin-scaffolder-studio-common
```

### 3. Configure the Backend

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

#### GitHub Publisher Configuration (Optional)

If you want to enable the GitHub publisher to create Pull Requests directly from the editor, you need to configure it in `app-config.yaml`:

```yaml
# app-config.yaml

scaffolder:
  studio:
    publishers:
      github:
        enabled: true
```

#### Schema Patches (Optional)

You can extend or modify the schema of existing Scaffolder actions using schema patches. This is useful for adding custom fields or modifying existing ones without forking the underlying action.

```yaml
# app-config.yaml

scaffolder:
  studio:
    schemaPatches:
      - id: 'catalog:register' # The action ID to patch
        patch:
          input:
            properties:
            customField:
              type: string
              title: Custom Field
              description: A custom field added via patch
          output:
            properties:
              customOutput:
                type: string
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

Permission IDs exported by `@kissmiklosjr/plugin-scaffolder-studio-common`:

- `scaffolderStudioPublishPermission`
- `scaffolderStudioUnpublishPermission`
- `scaffolderStudioPrefabReadPermission`
- `scaffolderStudioPrefabCreatePermission`
- `scaffolderStudioPrefabDeletePermission`
- `scaffolderStudioPermanentlyDeletePermission`

Use these in your permission policy (e.g., `packages/backend/src/extensions/permissionsPolicyExtension.ts`) to control access.

## Usage

1.  Navigate to `/scaffolder-studio` (or click the sidebar link).
2.  **Create a New Template**: Click "New Template" to start from scratch.
3.  **Edit**: Use the visual interface to add parameters and steps.
4.  **YAML View**: Switch to the YAML tab to see and edit the code directly.
5.  **Prefabs**: Save reusable configurations as "Prefabs" to use in other templates.
6.  **Dry Run**: Test your template directly within the editor.

## Troubleshooting

-   **Duplicate React Error**: Ensure that your `package.json` resolutions or peer dependencies are correctly set if you encounter issues with multiple React instances, especially when linking locally.
-   **Missing Icons**: This plugin uses MUI v5. Ensure you have `@mui/icons-material` installed.

