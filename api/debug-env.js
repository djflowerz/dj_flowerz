export default function handler(req, res) {
    const keys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE'));
    res.status(200).json({ 
        isServer: typeof window === 'undefined',
        envKeys: keys,
        hasUrl: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
        hasKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    });
}
