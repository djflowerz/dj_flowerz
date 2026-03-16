import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './worker/db/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
        databaseId: '6aafbef5-b064-4d98-bfd4-a4e0580d8b76',
        token: process.env.CLOUDFLARE_API_TOKEN || '',
    },
});
