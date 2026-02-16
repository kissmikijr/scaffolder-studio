import { mockServices } from '@backstage/backend-test-utils';

async function main() {
    const db = mockServices.database.mock();
    const client = await db.getClient();
    console.log('client is:', client);
    console.log('migrate is:', client?.migrate);
}
main().catch(console.error);
