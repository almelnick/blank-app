import express from "express";
import { config } from "./config.js";
import { webhookRouter } from "./routes/webhook.js";

const app = express();
app.use(express.json());

// Health check / landing route.
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "whatsapp-ai-twenty-crm" });
});

// WhatsApp Cloud API webhook (GET = verify, POST = events).
app.use("/webhook", webhookRouter);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  console.log(`Twenty CRM integration: ${config.twenty.enabled ? "enabled" : "disabled"}`);
});
