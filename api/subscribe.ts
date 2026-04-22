export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, source = 'Website' } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    try {
        const API_URL = process.env.VITE_API_URL || 'https://worker.djflowerz.workers.dev';
        
        // Proxy to the Worker to write to D1
        const resp = await fetch(`${API_URL}/api/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, source })
        });
        
        const data = await resp.json() as any;
        if (!resp.ok) throw new Error(data.error || 'Failed to subscribe');

        return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error: any) {
        console.error('Subscription error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred'
        });
    }
}
