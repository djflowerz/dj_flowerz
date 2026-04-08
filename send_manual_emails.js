
import fetch from 'node-fetch';

const USER_EMAIL = 'kelvinkaloki6@gmail.com';
const BASE_URL = 'https://www.djflowerz.co.ke';

async function sendExpiryEmail() {
    console.log(`Sending expiry email to ${USER_EMAIL}...`);
    const res = await fetch(`${BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: USER_EMAIL,
            subject: 'Your Premium Access has Expired 🎧',
            html: `
                <div style="font-family: sans-serif; background: #0b0b0f; border: 1px solid #1a1a20; padding: 30px; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">Access Expired</h2>
                    <p>Hello,</p>
                    <p>Your subscription to the DJ FLOWERZ Music Pool has expired.</p>
                    <p>To continue downloading the latest remixes, video edits, and mashups, please renew your plan.</p>
                    <div style="margin-top: 30px;">
                        <a href="https://www.djflowerz.co.ke/checkout" style="background: #a855f7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Renew Access</a>
                    </div>
                    <p style="font-size: 11px; color: #6b7280; margin-top: 25px;">Keep the vibes alive! - DJ Flowerz Team</p>
                </div>
            `,
            text: `Your subscription has expired. Renew here: https://www.djflowerz.co.ke/checkout`
        })
    });
    console.log(`Expiry Response: ${res.status}`);
}

async function sendRenewalReminder() {
    console.log(`Sending renewal reminder to ${USER_EMAIL}...`);
    const res = await fetch(`${BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: USER_EMAIL,
            subject: "Don't Stop the Music! 🎧 Renew Your Access",
            html: `
                <div style="font-family: sans-serif; background: #0b0b0f; border: 1px solid #1a1a20; padding: 30px; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #a855f7;">Come back to the Pool!</h2>
                    <p>Your <strong>DJ Flowerz Music Pool</strong> access is currently inactive.</p>
                    <p>Renew today to regain access to the latest remixes, club edits, and exclusive mashups.</p>
                    <div style="background: #15151a; padding: 15px; border-radius: 8px; border: 1px solid #333; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px;">Stay ahead of the game with our fresh weekly drops.</p>
                    </div>
                    <a href="https://www.djflowerz.co.ke/checkout" style="background: #a855f7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Renew Now</a>
                </div>
            `,
            text: `Your music pool access is inactive. Renew here: https://www.djflowerz.co.ke/checkout`
        })
    });
    console.log(`Renewal Response: ${res.status}`);
}

async function run() {
    await sendExpiryEmail();
    await sendRenewalReminder();
}

run().catch(console.error);
