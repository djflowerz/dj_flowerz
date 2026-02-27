
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_URL = process.env.VITE_R2_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`;

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
});

async function uploadToR2(key: string, body: Buffer, contentType: string) {
    console.log(`Uploading ${key}...`);
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    });
    await s3.send(command);
}

async function optimize() {
    const productsPath = path.join(process.cwd(), 'public/data/products.json');
    if (!fs.existsSync(productsPath)) {
        console.error("products.json not found");
        return;
    }

    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    console.log(`Optimizing ${products.length} products...`);

    for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Optimize 'images' array
        if (product.images && Array.isArray(product.images)) {
            for (let j = 0; j < product.images.length; j++) {
                const img = product.images[j];
                if (img && img.startsWith('data:image')) {
                    const match = img.match(/^data:image\/(.+);base64,(.+)$/);
                    if (match) {
                        const ext = match[1];
                        const base64Data = match[2];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const fileName = `products/${product.id}_${j}.${ext}`;
                        const key = `images/${fileName}`;

                        await uploadToR2(key, buffer, `image/${ext}`);
                        product.images[j] = `${R2_URL}/images/${fileName}`;
                    }
                }
            }
        }

        // Optimize singular 'image' property
        if (product.image && typeof product.image === 'string' && product.image.startsWith('data:image')) {
            const match = product.image.match(/^data:image\/(.+);base64,(.+)$/);
            if (match) {
                const ext = match[1];
                const base64Data = match[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `products/${product.id}_main.${ext}`;
                const key = `images/${fileName}`;

                await uploadToR2(key, buffer, `image/${ext}`);
                product.image = `${R2_URL}/images/${fileName}`;
            }
        }
    }

    // Save optimized JSON, minified to save even more space
    fs.writeFileSync(productsPath, JSON.stringify(products));
    console.log("✅ Optimized products.json saved locally.");

    // Upload optimized JSON back to R2
    await uploadToR2('data/products.json', Buffer.from(JSON.stringify(products)), 'application/json');
    console.log("✅ Uploaded optimized products.json to R2.");
}

optimize().catch(err => console.error(err));
