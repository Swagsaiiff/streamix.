import { Router } from "express";
import { sendError } from "../errors.js";
import { logger } from "../logger.js";

const SESSION_ID_RE = /^[a-f0-9]{64}$/;
const FILE_RE = /^[A-Za-z0-9._-]+$/;

function validSessionId(value) {
  return typeof value === "string" && SESSION_ID_RE.test(value);
}

function validFile(value) {
  return typeof value === "string" && value.length <= 80 && FILE_RE.test(value);
}

export function streamRouter({ provider, cache, streamManager, resolver, defaultLanguage = null }) {
  const router = Router();

  router.post("/stream/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    const preferredLanguage =
      req.query.lang ?? req.query.preferredLanguage ?? defaultLanguage ?? null;

    try {
      logger.info("stream.resolve", { type, id, preferredLanguage });
      const stream = await resolver.resolveStream(type, id, { preferredLanguage });
      logger.info("stream.source_resolved", {
        sourceType: stream.sourceType,
        resolution: stream.resolution.status,
        provider: stream.provider.name
      });

      const session = await streamManager.createSession(stream.sourceUrl, {
        preferredLanguage
      });
      logger.info("stream.session_created", { sessionId: session.sessionId, status: session.status });

      res.status(201).json({
        sessionId: session.sessionId,
        provider: stream.provider,
        resolution: stream.resolution,
        audioTracks: session.audioTracks,
        preferredLanguage: session.audioTracks.find((t) => t.default)?.language ?? null,
        title: stream.title,
        year: stream.year,
        mediaType: stream.mediaType,
        note: stream.note ?? null,
        playlistUrl: `/api/stream/${session.sessionId}/master.m3u8`
      });
    } catch (err) {
      logger.warn("stream.resolve_failed", { type, id, code: err.code ?? "internal" });
      return sendError(res, err);
    }
  });

  router.get("/stream/:sessionId/master.m3u8", async (req, res) => {
    const { sessionId } = req.params;
    if (!validSessionId(sessionId)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid session id" });
    }
    try {
      const { content } = await streamManager.getMasterPlaylist(sessionId);
      res.type("application/vnd.apple.mpegurl");
      res.send(content);
    } catch (err) {
      if (err.message.includes("not ready") || err.message.includes("not found")) {
        return res.status(404).json({ error: "not_found", message: "Session not found or not ready" });
      }
      return res.status(500).json({ error: "internal_error", message: "Failed to read playlist" });
    }
  });

  router.get("/stream/:sessionId/status", async (req, res) => {
    const { sessionId } = req.params;
    if (!validSessionId(sessionId)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid session id" });
    }
    const session = await streamManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "not_found", message: "Session not found" });
    }
    res.json({
      sessionId: session.sessionId,
      status: session.status,
      audioTracks: session.audioTracks,
      error: session.error,
      playlistUrl: session.status === "ready" ? `/api/stream/${sessionId}/master.m3u8` : null
    });
  });

  router.get("/stream/:sessionId/:file", async (req, res) => {
    const { sessionId, file } = req.params;
    if (!validSessionId(sessionId) || !validFile(file)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid session id or file name" });
    }
    try {
      const fullPath = await streamManager.resolveFile(sessionId, file);
      res.sendFile(fullPath);
    } catch (err) {
      if (err.message.includes("not ready") || err.message.includes("not found")) {
        return res.status(404).json({ error: "not_found", message: "Session or file not found" });
      }
      return res.status(400).json({ error: "validation_error", message: "Invalid session id or file name" });
    }
  });

  router.delete("/stream/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    if (!validSessionId(sessionId)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid session id" });
    }
    await streamManager.cleanupSession(sessionId);
    res.json({ status: "cleaned" });
  });

  return router;
}
