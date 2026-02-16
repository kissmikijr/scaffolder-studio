import { createBackendModule } from '@backstage/backend-plugin-api';

import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { ScaffolderVisualEditorPermissionPolicy } from './policies/ScaffolderVisualEditorPermissionPolicy';


export const permissionModuleScaffolderStudio = createBackendModule({
  pluginId: 'permission',
  moduleId: 'scaffolder-studio',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new ScaffolderVisualEditorPermissionPolicy());
      },
    });
  },
});
