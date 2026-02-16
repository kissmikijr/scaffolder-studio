import { createBackendModule } from '@backstage/backend-plugin-api';

import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { ScaffolderVisualEditorPermissionPolicy } from './policies/ScaffolderVisualEditorPermissionPolicy';


export const permissionModuleVisualScaffolderEditor = createBackendModule({
  pluginId: 'permission',
  moduleId: 'visual-scaffolder-editor',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new ScaffolderVisualEditorPermissionPolicy());
      },
    });
  },
});
