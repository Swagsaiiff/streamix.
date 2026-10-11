import express from "express";
import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { createTmdbEnricher } from "./providers/tmdb.js";
import { listConfiguredProviders } from "./providers/index.js";
import { homeRouter } from "./routes/home.js";
import { searchRouter } from "./routes/search.js";
import { detailRouter } from "./routes/detail.js";
import { streamRouter } from "./routes/stream.js";
import { providersRouter } from "./routes/providers.js";
import { createResolver } from "./providers/extractor.js";
import { createStreamManager } from "./providers/stream.js";
import { logger } from "./logger.js";

const cache = new TtlCache({ ttlMs: 300000 });
const providers = listConfiguredProviders({ cache });
const provider = providers[0];
const enricher = createTmdbEnricher({ apiKey: config.tmdbApiKey, cache });
const streamManager = createStreamManager({
  ffmpegPath: config.ffmpegPath,
  ffprobePath: config.ffprobePath,
  maxConcurrent: config.maxConcurrentSessions
});
const resolver = createResolver({ providers, fixturePath: config.fixturePath });

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
app.use("/api", streamRouter({ resolver, streamManager, defaultLanguage: config.preferredAudioLanguage }));
app.use("/api", providersRouter());

app.listen(PORT, async () => {
  logger.info("server.start", { port: PORT, provider: provider.getName(), tmdbEnrichment: enricher.isEnabled ? "enabled" : "disabled" });
  try {
    await streamManager.initHlsDir();
    logger.info("hls.workspace_ready", {});
  } catch (err) {
    logger.error("hls.workspace_init_failed", { error: err.message });
  }
});
