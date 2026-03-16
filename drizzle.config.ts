import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './worker/db/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
        databaseId: '62987ae1-d5e5-484a-8259-2642900a3a23',
        token: process.env.CLOUDFLARE_API_TOKEN || '',
    },
});
