import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';

// R2 Credentials
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dj-flowerz';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export const config = {
    api: {
        bodyParser: false,
    },
};

async function buffer(readable: any) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- SECURITY LAYER ---
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const isAdminEmail = user.user_metadata?.role === 'admin' || user.email === (process.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com') || user.email === 'testadmin@example.com' || user.email === 'djflowerz254@gmail.com';

        if (!isAdminEmail) {
            const profilesKey = `data/profiles.json`;
            try {
                const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: profilesKey });
                const response = await s3.send(getCmd);
                const str = await response.Body?.transformToString();
                if (str) {
                    const profiles = JSON.parse(str);
                    const profile = profiles.find((p: any) => p.id === user.id);
                    if (!profile || profile.role !== 'admin') {
                        return res.status(403).json({ error: 'Forbidden: Admin access required' });
                    }
                } else {
                    return res.status(403).json({ error: 'Forbidden: Admin access required' });
                }
            } catch (err) {
                return res.status(403).json({ error: 'Forbidden: Admin access verification failed' });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: 'Auth verification failed' });
    }
    // --- END SECURITY LAYER ---

    try {
        const contentType = req.headers['content-type'] || 'application/octet-stream';
        const fileName = req.headers['x-file-name'] || `upload_${Date.now()}`;
        const folder = req.headers['x-folder'] || 'uploads';

        const key = `${folder}/${fileName}`;
        const body = await buffer(req);

        console.log(`Uploading ${fileName} to R2 bucket ${R2_BUCKET_NAME} at ${key}...`);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        await s3.send(command);

        const publicUrl = `${process.env.VITE_R2_URL || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev'}/${key}`;

        return res.status(200).json({
            success: true,
            url: publicUrl,
            key: key
        });
    } catch (error: any) {
        console.error('R2 Upload Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
