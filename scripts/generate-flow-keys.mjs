#!/usr/bin/env node
/**
 * Generate the RSA key pair for the WhatsApp Flows endpoint.
 *
 * Usage:
 *   node scripts/generate-flow-keys.mjs                 # no passphrase
 *   node scripts/generate-flow-keys.mjs "my-passphrase" # encrypted private key
 *
 * Then:
 *   1. Put the PRIVATE key in .env as WHATSAPP_FLOW_PRIVATE_KEY (single line with \n).
 *   2. Upload the PUBLIC key to your phone number (command printed below).
 */
import crypto from "node:crypto";

const passphrase = process.argv[2] || "";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: passphrase
    ? { type: "pkcs8", format: "pem", cipher: "aes-256-cbc", passphrase }
    : { type: "pkcs8", format: "pem" },
});

console.log("\n=== PUBLIC KEY (upload to WhatsApp) ===\n");
console.log(publicKey);

console.log("=== PRIVATE KEY (keep secret) ===\n");
console.log(privateKey);

console.log("=== .env (single-line private key) ===\n");
console.log(`WHATSAPP_FLOW_PRIVATE_KEY="${privateKey.trim().replace(/\n/g, "\\n")}"`);
if (passphrase) {
  console.log(`WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE="${passphrase}"`);
}

console.log("\n=== Upload the public key to your phone number ===\n");
console.log(`curl -X POST \\
  "https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/whatsapp_business_encryption" \\
  -H "Authorization: Bearer <WHATSAPP_TOKEN>" \\
  --data-urlencode "business_public_key=$(cat <<'PEM'
${publicKey.trim()}
PEM
)"`);
console.log("");
