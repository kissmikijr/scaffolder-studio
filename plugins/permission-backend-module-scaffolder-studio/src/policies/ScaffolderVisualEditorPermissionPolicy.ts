import {
    PolicyDecision,
    AuthorizeResult,
} from '@backstage/plugin-permission-common';
import {
    PermissionPolicy,
    PolicyQuery,
} from '@backstage/plugin-permission-node';
import { VISUAL_SCAFFOLDER_EDITOR_PERMISSIONS as PERMISSIONS } from './consts';

export class ScaffolderVisualEditorPermissionPolicy implements PermissionPolicy {
    async handle(request: PolicyQuery): Promise<PolicyDecision> {
        const { permission } = request;

        switch (permission.name) {
            case PERMISSIONS.PUBLISH:
            case PERMISSIONS.UNPUBLISH:
                return { result: AuthorizeResult.ALLOW };

            default:
                return { result: AuthorizeResult.DENY };
        }
    }
}
