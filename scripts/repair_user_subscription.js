const axios = require('axios');

const WORKER_URL = "https://djflowerz-worker.ianmuriithiflowerz.workers.dev";
const SECRET = "sk_live_ec66162f517e07fb5e2322ec5e5281e2fe3ab74b";
const EMAIL = "djearlyhours1@gmail.com";

async function grant() {
    console.log(`Granting 30 days to ${EMAIL}...`);
    try {
        const res = await axios.post(`${WORKER_URL}/api/admin/manual-grant`, {
            type: 'subscription',
            email: EMAIL,
            amount: 700
        }, {
            headers: {
                'Authorization': `Bearer ${SECRET}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("Response:", res.data);
    } catch (error) {
        console.error("Grant failed:", error.response?.data || error.message);
    }
}

grant();
