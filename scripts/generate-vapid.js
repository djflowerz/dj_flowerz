// scripts/generate-vapid.js
import crypto from 'crypto';

function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });

  const encode = (key, format) =>
    publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64url');

  console.log('--- DJ FLOWERZ VAPID KEYS ---');
  console.log('Public Key (Use in Frontend & Backend):');
  console.log(pub);
  console.log('\nPrivate Key (KEEP SECRET - Use in Backend only):');
  console.log(priv);
  console.log('------------------------------');
}

generateVapidKeys();
