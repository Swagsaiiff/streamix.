import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { providerRegistry } from './providers/index.js';
import { tmdbEnricher } from './providers/tmdb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

function createErrorResponse(message, status = 500) {
  return { error: message, timestamp: new Date().toISOString() };
}

async function enrichTitleWithTmdb(title) {
  if (!tmdbEnricher.isEnabled()) return title;

  try {
    const type = title.type;
    const year = title.year;
    const titleStr = title.title;

    if (!type || !titleStr) return title;

    const enrichment = await tmdbEnricher.enrichTitle(titleStr, type, year);
    if (!enrichment) return title;

    return {
      ...title,
      tmdbId: enrichment.tmdbId,
      poster: enrichment.poster ?? title.poster,
      backdrop: enrichment.backdrop ?? title.backdrop,
      overview: enrichment.overview ?? title.overview,
      rating: enrichment.rating ?? title.rating,
      genres: enrichment.genres?.length ? enrichment.genres : title.genres,
      year: enrichment.year ?? title.year,
    };
  } catch (error) {
    console.warn('[TMDB] Enrichment failed:', error);
    return title;
  }
}

function formatTitleForResponse(title) {
  return {
    id: title.id,
    title: title.title,
    type: title.type,
    poster: title.poster ?? null,
    backdrop: title.backdrop ?? null,
    overview: title.overview ?? null,
    year: title.year ?? null,
    genres: title.genres ?? null,
    rating: title.rating ?? null,
    source: title.source,
    sourceUrl: title.sourceUrl ?? null,
    tmdbId: title.tmdbId ?? null,
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/home/trending', async (req, res) => {
  try {
    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const home = await provider.fetchHomePage();
    const allTitles = home.sections.flatMap(s => s.titles);

    const enriched = await Promise.all(allTitles.slice(0, 20).map(t => enrichTitleWithTmdb(t)));
    const formatted = enriched.map(formatTitleForResponse);

    res.json({
      titles: formatted,
      provider: provider.getName(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/home/trending error:', error);
    res.status(500).json(createErrorResponse('Failed to fetch trending content'));
  }
});

app.get('/api/home/latest', async (req, res) => {
  try {
    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const home = await provider.fetchHomePage();
    const movieSection = home.sections.find(s => s.name.toLowerCase().includes('movie'));
    const seriesSection = home.sections.find(s => s.name.toLowerCase().includes('series'));

    const titles = [
      ...(movieSection?.titles.slice(0, 10) ?? []),
      ...(seriesSection?.titles.slice(0, 10) ?? []),
    ];

    const enriched = await Promise.all(titles.map(t => enrichTitleWithTmdb(t)));
    const formatted = enriched.map(formatTitleForResponse);

    res.json({
      titles: formatted,
      provider: provider.getName(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/home/latest error:', error);
    res.status(500).json(createErrorResponse('Failed to fetch latest content'));
  }
});

app.get('/api/home/popular-series', async (req, res) => {
  try {
    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const home = await provider.fetchHomePage();
    const seriesSections = home.sections.filter(s =>
      s.name.toLowerCase().includes('series') ||
      s.name.toLowerCase().includes('anime')
    );

    const allSeries = seriesSections.flatMap(s =>
      s.titles.filter(t => t.type === 'series')
    ).slice(0, 20);

    const enriched = await Promise.all(allSeries.map(t => enrichTitleWithTmdb(t)));
    const formatted = enriched.map(formatTitleForResponse);

    res.json({
      titles: formatted,
      provider: provider.getName(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/home/popular-series error:', error);
    res.status(500).json(createErrorResponse('Failed to fetch popular series'));
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json(createErrorResponse('Query parameter "q" required (min 2 chars)', 400));
    }

    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const searchResult = await provider.search(query.trim());
    const enriched = await Promise.all(searchResult.titles.slice(0, 20).map(t => enrichTitleWithTmdb(t)));
    const formatted = enriched.map(formatTitleForResponse);

    res.json({
      titles: formatted,
      query: query.trim(),
      provider: provider.getName(),
      hasMore: searchResult.hasMore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/search error:', error);
    res.status(500).json(createErrorResponse('Search failed'));
  }
});

app.get('/api/detail/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    if (!sourceId) {
      return res.status(400).json(createErrorResponse('sourceId parameter required', 400));
    }

    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const detail = await provider.fetchDetail(decodeURIComponent(sourceId));
    if (!detail) {
      return res.status(404).json(createErrorResponse('Content not found', 404));
    }

    const enriched = await enrichTitleWithTmdb(detail);
    const formatted = formatTitleForResponse(enriched);

    if (detail.type === 'series' && detail.providerData) {
      const meta = detail.providerData;
      const seasons = (meta.videos ?? [])
        .reduce((acc, ep) => {
          const seasonNum = ep.season;
          if (!acc[seasonNum]) acc[seasonNum] = { season: seasonNum, episodes: 0 };
          acc[seasonNum].episodes++;
          return acc;
        }, {});
      formatted.seasons = seasons ? Object.values(seasons) : [];
    }

    res.json({
      ...formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/detail error:', error);
    res.status(500).json(createErrorResponse('Failed to fetch detail'));
  }
});

app.get('/api/episodes/:sourceId/:season', async (req, res) => {
  try {
    const { sourceId, season } = req.params;
    const seasonNum = parseInt(season, 10);
    if (isNaN(seasonNum)) {
      return res.status(400).json(createErrorResponse('Invalid season number', 400));
    }

    const provider = providerRegistry.get('CineStream');
    if (!provider) {
      return res.status(503).json(createErrorResponse('No content provider available'));
    }

    const episodes = await provider.fetchEpisodes(decodeURIComponent(sourceId), seasonNum);
    const enriched = await Promise.all(episodes.map(t => enrichTitleWithTmdb(t)));
    const formatted = enriched.map(formatTitleForResponse);

    res.json({
      episodes: formatted,
      season: seasonNum,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/episodes error:', error);
    res.status(500).json(createErrorResponse('Failed to fetch episodes'));
  }
});

app.use((req, res) => {
  res.status(404).json(createErrorResponse('Not found', 404));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json(createErrorResponse('Internal server error'));
});

app.listen(PORT, () => {
  console.log(`STREAMIX backend listening on http://localhost:${PORT}`);
});

export default app;