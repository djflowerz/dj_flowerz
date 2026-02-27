import * as fs from 'fs';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the vercel env file
const envPath = path.resolve(process.cwd(), '.env.vercel.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Set environment variables for the current process
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

console.log("Environment loaded. Starting migration...");

// Run the migration script
try {
    execSync('npx tsx scripts/migrate-firebase-to-supabase.ts', { stdio: 'inherit' });
} catch (e) {
    console.error("Migration failed.");
}
