
import { createClient } from '@supabase/supabase-js';
import admin from '../admin-db.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

export default async function handler(req: any, res: any) {
    const { method } = req;

    // 1. Verify Authentication & Admin Status
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userEmail = decodedToken.email;

        // Check against admin email
        const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com';
        if (userEmail !== ADMIN_EMAIL) {
            return res.status(403).json({ error: 'Not authorized as admin' });
        }

        // 2. Handle CRUD Operations
        switch (method) {
            case 'POST': {
                const track = req.body;
                const { data, error } = await supabase
                    .from('pool_tracks')
                    .insert([track])
                    .select();
                if (error) throw error;
                return res.status(201).json(data[0]);
            }
            case 'PUT':
            case 'PATCH': {
                const { id, ...updateData } = req.body;
                if (!id) return res.status(400).json({ error: 'Missing track ID' });
                const { data, error } = await supabase
                    .from('pool_tracks')
                    .update(updateData)
                    .eq('id', id)
                    .select();
                if (error) throw error;
                return res.status(200).json(data[0]);
            }
            case 'DELETE': {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'Missing track ID' });
                const { error } = await supabase
                    .from('pool_tracks')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            }
            default:
                res.setHeader('Allow', ['POST', 'PUT', 'PATCH', 'DELETE']);
                return res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        console.error('Admin Pool Track Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
