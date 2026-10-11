import express from "express";
import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { createProvider } from "./providers/index.js";
import { createTmdbEnricher } from "./providers/tmdb.js";
import { homeRouter } from "./routes/home.js";
import { searchRouter } from "./routes/search.js";
import { detailRouter } from "./routes/detail.js";
import { streamRouter } from "./routes/stream.js";
import { createResolver } from "./providers/extractor.js";
import { createStreamManager } from "./providers/stream.js";

const cache = new TtlCache({ ttlMs: 300000 });
const provider = createProvider("CineStream", { cache });
const enricher = createTmdbEnricher({ apiKey: config.tmdbApiKey, cache });
const streamManager = createStreamManager({
  ffmpegPath: config.ffmpegPath,
  ffprobePath: config.ffprobePath,
  maxConcurrent: config.maxConcurrentSessions
});
const resolver = createResolver({ provider, fixturePath: config.fixturePath });

const app = express();
const PORT = config.port;

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "streamix-server",
    version: "0.3.0",
    time: new Date().toISOString()
  });
});

app.use("/api/home", homeRouter({ provider, enricher, cache }));
app.use("/api/search", searchRouter({ provider, enricher, cache }));
app.use("/api", detailRouter({ provider, cache }));
app.use("/api", streamRouter({ resolver, streamManager }));

app.listen(PORT, async () => {
  console.log(`[streamix] server listening on http://localhost:${PORT}`);
  console.log(`[streamix] provider=${provider.getName()} tmdb_enrichment=${enricher.isEnabled ? "enabled" : "disabled"}`);
  try {
    await streamManager.initHlsDir();
    console.log("[streamix] HLS temp directory initialized");
  } catch (err) {
    console.error(`[streamix] HLS workspace init failed: ${err.message}`);
  }
});
