/**
 * Generate Apple Sign In Client Secret
 *
 * This script generates a JWT client secret for Apple Sign In.
 * The secret expires in 6 months (Apple's maximum).
 *
 * Usage: node scripts/generate-apple-secret.js
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Configuration - Update these values
const CONFIG = {
  teamId: 'SU8Y8754W5',           // Your Apple Team ID
  keyId: '7427SJHYLC',            // Your Key ID
  clientId: 'ai.realworth.service', // Your Services ID
  keyPath: path.join(require('os').homedir(), 'Downloads', 'AuthKey_7427SJHYLC.p8'),
};

// Read the private key
let privateKey;
try {
  privateKey = fs.readFileSync(CONFIG.keyPath, 'utf8');
} catch (error) {
  console.error(`Error reading private key from ${CONFIG.keyPath}`);
  console.error('Make sure the .p8 file exists at the specified path');
  process.exit(1);
}

// Generate the JWT
const now = Math.floor(Date.now() / 1000);
const expiry = now + (86400 * 180); // 180 days (6 months)

const payload = {
  iss: CONFIG.teamId,
  iat: now,
  exp: expiry,
  aud: 'https://appleid.apple.com',
  sub: CONFIG.clientId,
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  header: {
    alg: 'ES256',
    kid: CONFIG.keyId,
  },
});

console.log('\n=== Apple Sign In Client Secret ===\n');
console.log('Copy this entire token and paste it into Supabase:\n');
console.log(token);
console.log('\n');
console.log('Details:');
console.log(`  Team ID: ${CONFIG.teamId}`);
console.log(`  Key ID: ${CONFIG.keyId}`);
console.log(`  Client ID: ${CONFIG.clientId}`);
console.log(`  Expires: ${new Date(expiry * 1000).toISOString()}`);
console.log('\nRemember to regenerate this secret before it expires (in ~6 months)!');
