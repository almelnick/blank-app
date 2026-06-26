import express from "express";
import { config } from "./config.js";
import { webhookRouter } from "./routes/webhook.js";
import { flowsRouter } from "./routes/flows.js";

const app = express();

// Parse JSON and keep the raw body so we can verify Meta's signatures.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Health check / landing route.
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "whatsapp-ai-twenty-crm" });
});

// WhatsApp Cloud API webhook (GET = verify, POST = events).
app.use("/webhook", webhookRouter);

// WhatsApp Flows encrypted data-exchange endpoint.
app.use("/flows", flowsRouter);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  console.log(`Twenty CRM integration: ${config.twenty.enabled ? "enabled" : "disabled"}`);
  console.log(`WhatsApp Flows endpoint: ${config.flows.enabled ? "enabled" : "disabled"}`);
  if (config.flows.enabled && !config.whatsapp.appSecret) {
    console.warn("⚠️  Flows enabled but WHATSAPP_APP_SECRET is not set — signature checks are skipped.");
  }
});
