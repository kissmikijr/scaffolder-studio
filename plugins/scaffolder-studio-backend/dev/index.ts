import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));

// TEMPLATE NOTE:
// Rather than using a real catalog you can use a mock with a fixed set of entities.
// backend.add(
//   catalogServiceMock.factory({
//     entities: [
//       {
//         apiVersion: 'backstage.io/v1alpha1',
//         kind: 'Component',
//         metadata: {
//           name: 'sample',
//           title: 'Sample Component',
//         },
//         spec: {
//           type: 'service',
//         },
//       },
//       {
//         apiVersion: 'backstage.io/v1alpha1',
//         kind: 'User',
//         metadata: {
//           name: 'test-user',
//           title: 'Test User',
//         },
//       },
//       {
//         apiVersion: 'backstage.io/v1alpha1',
//         kind: 'User',
//         metadata: {
//           name: 'test-user2',
//           title: 'Test User 2',
//         },
//       },
//       {
//         apiVersion: 'backstage.io/v1alpha1',
//         kind: 'Group',
//         metadata: {
//           name: 'test-group',
//           title: 'Test Group',
//         },
//       },
//     ],
//   }),
// );
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('../src'));

backend.start();
