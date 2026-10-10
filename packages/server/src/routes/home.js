import { Router } from "express";
import { ProviderError } from "../providers/base.js";

const ROW_LIMIT = 24;
const PAGE_COUNT = 3;
const CACHE_TTL_MS = 300000;

function sendProviderError(res, err) {
  if (err instanceof ProviderError) {
    const status = err.code === "timeout" ? 504 : 502;
    return res.status(status).json({
      error: "provider_error",
      code: err.code,
      message: `Upstream provider request failed (${err.code}).`
    });
  }
  return res.status(500).json({ error: "internal_error", message: "An unexpected error occurred." });
}

export function homeRouter({ provider, enricher, cache }) {
  const router = Router();
  const ranking = provider.getCapabilities().rankingMethod;

  function route(key, title, rankingNote, fetchItems) {
    router.get(`/${key}`, async (_req, res) => {
      const cacheKey = `route:home:${key}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json({ ...cached, cached: true });

      try {
        const items = await fetchItems();
        const enrichedResult = await enricher.enrich(items);
        const sliced = items.slice(0, ROW_LIMIT);
        const body = {
          key,
          title,
          ranking: `${ranking}${rankingNote}`,
          enrichment: {
            status: enrichedResult.status,
            reason: enrichedResult.reason ?? null,
            matched: enrichedResult.matched
          },
          count: sliced.length,
          cached: false,
          stale: false,
          items: sliced
        };
        cache.set(cacheKey, body, CACHE_TTL_MS);
        return res.json(body);
      } catch (err) {
        const stale = cache.get(cacheKey);
        if (stale) return res.json({ ...stale, cached: true, stale: true });
        return sendProviderError(res, err);
      }
    });
  }

  route("trending", "Trending Movies", "", () => provider.getTopMovies(PAGE_COUNT));
  route(
    "latest",
    "Latest Movies",
    "; newest-first order: provider exposes no dedicated latest catalog, so the top movie catalog is sorted by release year descending",
    async () => {
      const items = await provider.getTopMovies(PAGE_COUNT);
      return items.filter((item) => item.year != null).sort((a, b) => b.year - a.year);
    }
  );
  route("popular-series", "Popular Series", "", () => provider.getTopSeries(PAGE_COUNT));

  return router;
}
