import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

async function recreateTrigger() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log('Recreating auth trigger for profile creation...');

        const sql = `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
          INSERT INTO public.profiles (id, name, email, role, avatar_url, created_at, updated_at)
          VALUES (
            new.id, 
            COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
            new.email, 
            'user',
            COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://ui-avatars.com/api/?name=User&background=random'),
            NOW(),
            NOW()
          ) ON CONFLICT (id) DO NOTHING;
          RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        `;

        await client.query(sql);
        console.log('Trigger successfully recreated and attached to auth.users.');

    } catch (err) {
        console.error('Error recreating trigger:', err);
    } finally {
        await client.end();
    }
}

recreateTrigger();
