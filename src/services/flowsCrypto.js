import crypto from "node:crypto";
import { config } from "../config.js";

/**
 * Encryption helpers for the WhatsApp Flows data-exchange endpoint.
 *
 * Meta encrypts every request with a hybrid scheme:
 *   - a one-time AES key, itself encrypted with our RSA public key (RSA-OAEP/SHA-256)
 *   - the flow payload, encrypted with that AES key (AES-GCM)
 * We must decrypt the request and encrypt the response with the SAME AES key
 * but an INVERTED initialization vector (that's the part everyone gets wrong).
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/flows/reference/implementingyourflowendpoint
 */

const TAG_LENGTH = 16; // AES-GCM auth tag length in bytes.

/**
 * Decrypt an incoming Flows request.
 *
 * @param {{encrypted_flow_data:string, encrypted_aes_key:string, initial_vector:string}} body
 * @returns {{ decryptedBody: object, aesKey: Buffer, iv: Buffer }}
 */
export function decryptRequest(body) {
  const { encrypted_flow_data, encrypted_aes_key, initial_vector } = body;

  const privateKey = crypto.createPrivateKey({
    key: config.flows.privateKey,
    passphrase: config.flows.passphrase || undefined,
  });

  // 1. Unwrap the AES key with our RSA private key.
  const aesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(encrypted_aes_key, "base64")
  );

  // 2. Split ciphertext / auth tag and AES-GCM decrypt the flow data.
  const flowData = Buffer.from(encrypted_flow_data, "base64");
  const iv = Buffer.from(initial_vector, "base64");
  const ciphertext = flowData.subarray(0, flowData.length - TAG_LENGTH);
  const authTag = flowData.subarray(flowData.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(`aes-${aesKey.length * 8}-gcm`, aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return { decryptedBody: JSON.parse(decrypted.toString("utf8")), aesKey, iv };
}

/**
 * Encrypt a response with the request's AES key and an INVERTED IV.
 * Returns base64 text (ciphertext + auth tag), which is the raw response body.
 *
 * @param {object} response - Plain response object.
 * @param {Buffer} aesKey - The AES key from decryptRequest.
 * @param {Buffer} iv - The original IV from decryptRequest.
 * @returns {string} base64-encoded response body.
 */
export function encryptResponse(response, aesKey, iv) {
  const flippedIv = Buffer.from(iv.map((b) => ~b & 0xff));

  const cipher = crypto.createCipheriv(`aes-${aesKey.length * 8}-gcm`, aesKey, flippedIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return encrypted.toString("base64");
}

/**
 * Verify Meta's x-hub-signature-256 header against the raw request body.
 * Returns true (skips) when no app secret is configured.
 *
 * @param {Buffer|string} rawBody - The raw, unparsed request body.
 * @param {string|undefined} signatureHeader - Value of x-hub-signature-256.
 * @returns {boolean}
 */
export function isSignatureValid(rawBody, signatureHeader) {
  if (!config.whatsapp.appSecret) return true; // not configured → skip
  if (!signatureHeader || !rawBody) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", config.whatsapp.appSecret).update(rawBody).digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
