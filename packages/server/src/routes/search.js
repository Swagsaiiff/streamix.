import { Router } from "express";
import { sendError } from "../errors.js";

const CACHE_TTL_MS = 600000;

function validateQuery(value) {
  if (value == null) return { error: "Missing required query parameter 'q'." };
  const q = String(value).trim();
  if (q.length < 2) return { error: "Query 'q' must be at least 2 characters." };
  if (q.length > 100) return { error: "Query 'q' must be at most 100 characters." };
  if (/[\u0000-\u001f\u007f]/.test(q)) return { error: "Query 'q' contains invalid control characters." };
  return { q };
}

export function searchRouter({ provider, enricher, cache }) {
  const router = Router();

  router.get("/search", async (req, res) => {
    const validated = validateQuery(req.query.q);
    if (validated.error) {
      return res.status(400).json({ error: "validation_error", message: validated.error });
    }
    const q = validated.q;
    const cacheKey = `route:search:${q.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    try {
      const items = await provider.search(q);
      const enrichedResult = await enricher.enrich(items);
      const body = {
        query: q,
        count: items.length,
        enrichment: {
          status: enrichedResult.status,
          reason: enrichedResult.reason ?? null,
          matched: enrichedResult.matched
        },
        cached: false,
        stale: false,
        items
      };
      cache.set(cacheKey, body, CACHE_TTL_MS);
      return res.json(body);
      } catch (err) {
        const stale = cache.get(cacheKey);
        if (stale) return res.json({ ...stale, cached: true, stale: true });
        return sendError(res, err);
      }
  });

  return router;
}
