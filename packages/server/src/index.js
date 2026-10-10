import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "streamix-server",
    version: "0.0.0",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[streamix] server listening on http://localhost:${PORT}`);
});
