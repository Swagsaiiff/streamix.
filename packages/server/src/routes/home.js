import { Router } from "express";
import { sendError } from "../errors.js";

const ROW_LIMIT = 24;
const PAGE_COUNT = 3;
const LATEST_PAGE_COUNT = 5;
const LATEST_PAGE_SKIP = 147;
const CACHE_TTL_MS = 300000;

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
        const sliced = items.slice(0, ROW_LIMIT);
        const body = {
          key,
          title,
          ranking: `${ranking}${rankingNote}`,
          enrichment: enricher.isEnabled
            ? { status: "pending", reason: null, matched: null }
            : { status: "disabled", reason: "no_tmdb_key", matched: 0 },
          count: sliced.length,
          cached: false,
          stale: false,
          items: sliced
        };
        cache.set(cacheKey, body, CACHE_TTL_MS);

        if (enricher.isEnabled) {
          enricher
            .enrich(sliced)
            .then(({ items: enrichedItems, matched }) => {
              const refreshed = {
                ...body,
                enrichment: { status: "enabled", reason: null, matched },
                items: enrichedItems
              };
              cache.set(cacheKey, refreshed, CACHE_TTL_MS);
            })
            .catch(() => {});
        }

        return res.json(body);
      } catch (err) {
        const stale = cache.get(cacheKey);
        if (stale) return res.json({ ...stale, cached: true, stale: true });
        return sendError(res, err);
      }
    });
  }

  route("trending", "Top Movies", "", () => provider.getTopMovies(PAGE_COUNT));
  route(
    "latest",
    "Newest Movies",
    "; provider exposes no dedicated latest catalog: newest-first sort of the top movie catalog beyond the leading titles (skip 147+)",
    async () => {
      const items = await provider.getTopMovies(LATEST_PAGE_COUNT, LATEST_PAGE_SKIP);
      return items.filter((item) => item.year != null).sort((a, b) => b.year - a.year);
    }
  );
  route("popular-series", "Top Series", "", () => provider.getTopSeries(PAGE_COUNT));

  return router;
}
