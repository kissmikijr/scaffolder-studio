import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  PolicyDecision,
  isPermission,
  AuthorizeResult,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  visualScaffolderEditorPublishPermission,
  visualScaffolderEditorUnpublishPermission,
  visualScaffolderEditorPrefabReadPermission,
  visualScaffolderEditorPrefabCreatePermission,
  visualScaffolderEditorPrefabDeletePermission,
  visualScaffolderEditorPermanentlyDeletePermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

class TestPermissionPolicy implements PermissionPolicy {
  async handle(request: PolicyQuery): Promise<PolicyDecision> {
    const { permission } = request;
    if (
      isPermission(
        permission,
        visualScaffolderEditorPermanentlyDeletePermission,
      )
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (isPermission(permission, visualScaffolderEditorPublishPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (isPermission(permission, visualScaffolderEditorUnpublishPermission)) {
      return { result: AuthorizeResult.DENY };
    }
    if (isPermission(permission, visualScaffolderEditorPrefabReadPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (
      isPermission(permission, visualScaffolderEditorPrefabCreatePermission)
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (
      isPermission(permission, visualScaffolderEditorPrefabDeletePermission)
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'permission-policy',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new TestPermissionPolicy());
      },
    });
  },
});
