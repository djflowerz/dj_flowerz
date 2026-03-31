const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const REGION = "auto";
const ACCESS_KEY_ID = "4edededb28b4666323bf7a763ab391d1";
const SECRET_ACCESS_KEY = "5d2ce9467a45d362df943ea8e0c5afd0857c2be36524c97d4026f1bd570f3a22";
const ACCOUNT_ID = "ca961f0eb41ca2bf77291b1769ca1c1d";
const BUCKET_NAME = "djflowerz-images";
const TARGET_EMAIL = "djearlyhours1@gmail.com";

const s3 = new S3Client({
    region: REGION,
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}

async function repair() {
    try {
        console.log(`[Repair] Fetching data/profiles.json from R2...`);
        const getObj = await s3.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: "data/profiles.json",
        }));

        const content = await streamToString(getObj.Body);
        let profiles = JSON.parse(content);
        console.log(`[Repair] Loaded ${profiles.length} profiles.`);

        const userIndex = profiles.findIndex(p => (p.email || "").toLowerCase() === TARGET_EMAIL.toLowerCase());
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const expiryStr = expiryDate.toISOString().replace('T', ' ').substring(0, 19);

        if (userIndex === -1) {
            console.log(`[Repair] User not found. Creating a temporary entry for: ${TARGET_EMAIL}`);
            // If user isn't in R2 yet, we can't fully fix them without their Supabase UUID.
            // But we can create a placeholder if the site logic allows it.
            // Actually, better to just log and alert if they haven't registered.
            // Wait, their Supabase ID might be available if I search another table or if they previously registered.
            console.error("CRITICAL: User has not registered on the site yet (no profile found). Access cannot be granted without a linked Supabase account.");
            return;
        }

        console.log(`[Repair] Found user: ${profiles[userIndex].full_name || profiles[userIndex].name || TARGET_EMAIL}`);
        
        profiles[userIndex].is_subscriber = 1;
        profiles[userIndex].isSubscriber = true;
        profiles[userIndex].subscription_expiry = expiryStr;
        profiles[userIndex].subscriptionExpiry = expiryStr;
        profiles[userIndex].updated_at = new Date().toISOString();
        profiles[userIndex].updatedAt = new Date().toISOString();

        console.log(`[Repair] Updating user access until ${expiryStr}...`);

        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: "data/profiles.json",
            Body: JSON.stringify(profiles),
            ContentType: "application/json",
        }));

        console.log(`[Repair] SUCCESS: User granted Music Pool access.`);
    } catch (err) {
        console.error(`[Repair] FAILED:`, err);
    }
}

repair();
