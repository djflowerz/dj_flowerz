const https = require('https');

function request(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({status: res.statusCode, body: JSON.parse(body)}));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

(async () => {
    // 1. Start Session
    const startObj = await request('https://djflowerz.co.ke/api/chat/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, { name: 'TestUser', email: 'test@example.com' });
    const sessionId = startObj.body.sessionId;
    console.log('Session ID:', sessionId);

    // 2. Send Message
    await request('https://djflowerz.co.ke/api/chat/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, {
        sessionId,
        text: "why didn't i get access to musicpool after payment. here is my receipt from Paystack: kelvinkaloki6@gmail.com just paid djflowerz KES 200.00 Reference subscription_1775066420654_45 Date 1st Apr, 2026"
    });
    console.log('Message sent, waiting for AI reply...');

    // Wait a few seconds for AI
    await new Promise(r => setTimeout(r, 6000));

    // 3. Get session info
    const sessionObj = await request(`https://djflowerz.co.ke/api/chat/session/${sessionId}`, { method: 'GET' });
    const messages = sessionObj.body.messages;
    console.log('\nAI Reply:\n', messages[messages.length - 1].text);
})();
