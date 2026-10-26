
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleChatMessage } from "./services/chat.service.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "unwind-chatbot-test" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const result = await handleChatMessage({
      message: req.body?.message,
      history: req.body?.history
    });

    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "The chatbot could not process that request."
    });
  }
});

app.listen(port, () => {
  console.log(`UNWIND chatbot backend listening on http://localhost:${port}`);
});
