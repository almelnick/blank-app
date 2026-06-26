import { Router } from "express";
import { config } from "../config.js";
import { decryptRequest, encryptResponse, isSignatureValid } from "../services/flowsCrypto.js";
import { handleFlow } from "../services/flowHandler.js";

export const flowsRouter = Router();

/**
 * WhatsApp Flows data-exchange endpoint.
 *
 * Every request is encrypted. The flow is:
 *   verify signature → decrypt → handle (ping / error / business logic) → encrypt.
 *
 * Special HTTP status codes Meta expects on failure:
 *   432 → signature verification failed
 *   421 → could not decrypt (client will refresh and retry)
 */
flowsRouter.post("/", async (req, res) => {
  if (!config.flows.enabled) return res.sendStatus(404);

  // 1. Verify the request really came from Meta.
  if (!isSignatureValid(req.rawBody, req.get("x-hub-signature-256"))) {
    console.warn("Flow request failed signature verification.");
    return res.sendStatus(432);
  }

  // 2. Decrypt the payload.
  let decryptedBody;
  let aesKey;
  let iv;
  try {
    ({ decryptedBody, aesKey, iv } = decryptRequest(req.body));
  } catch (err) {
    console.error("Flow decryption failed:", err.message);
    return res.sendStatus(421);
  }

  const respond = (payload) => res.type("text/plain").send(encryptResponse(payload, aesKey, iv));

  // 3. Health check ping from Meta.
  if (decryptedBody.action === "ping") {
    return respond({ data: { status: "active" } });
  }

  // 4. Client-side error notification — just acknowledge it.
  if (decryptedBody.data?.error_message || decryptedBody.data?.error) {
    console.warn("Flow client reported an error:", decryptedBody.data);
    return respond({ data: { acknowledged: true } });
  }

  // 5. Business logic → next screen or completion.
  try {
    const response = await handleFlow(decryptedBody);
    return respond(response);
  } catch (err) {
    console.error("Flow handler failed:", err.message);
    return res.sendStatus(500);
  }
});
