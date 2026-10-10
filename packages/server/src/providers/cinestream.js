import { BaseProvider, providerRegistry } from './base.js';

export class CineStreamProvider extends BaseProvider {
  constructor(config = { name: 'CineStream', baseUrl: 'https://v3-cinemeta.strem.io' }) {
    super({ ...config, timeoutMs: 15000 });
    this.cinemetaUrl = 'https://v3-cinemeta.strem.io';
    this.kitsuUrl = 'https://anime-kitsu.strem.fun';
    this.imageProxy = 'https://wsrv.nl/?url=';
    this.haglundUrl = 'https://arm.haglund.dev/api/v2';
  }

  getName() {
    return 'CineStream';
  }

  getCapabilities() {
    return {
      supportsHomePage: true,
      supportsSearch: true,
      supportsDetail: true,
      supportsEpisodes: true,
      supportedTypes: ['movie', 'series'],
    };
  }

  getProxiedImage(url) {
    if (!url) return undefined;
    if (url.includes('metahub.space') || url.includes('kitsu.')) {
      return this.imageProxy + url;
    }
    return url;
  }

  getCinemetaUrl(path) {
    return `${this.cinemetaUrl}${path}`;
  }

  getKitsuUrl(path) {
    return `${this.kitsuUrl}${path}`;
  }

  async fetchHomePage() {
    const sections = [];

    const catalogs = [
      { path: '/catalog/movie/top/skip=0.json', name: 'Top Movies' },
      { path: '/catalog/series/top/skip=0.json', name: 'Top Series' },
      { path: '/catalog/anime/kitsu-anime-airing/skip=0.json', name: 'Airing Anime', useKitsu: true },
      { path: '/catalog/anime/kitsu-anime-trending/skip=0.json', name: 'Trending Anime', useKitsu: true },
      { path: '/catalog/movie/top/skip=0.json&genre=Action', name: 'Action Movies' },
      { path: '/catalog/series/top/skip=0.json&genre=Action', name: 'Action Series' },
      { path: '/catalog/movie/top/skip=0.json&genre=Comedy', name: 'Comedy Movies' },
      { path: '/catalog/series/top/skip=0.json&genre=Comedy', name: 'Comedy Series' },
      { path: '/catalog/movie/top/skip=0.json&genre=Drama', name: 'Drama Movies' },
      { path: '/catalog/series/top/skip=0.json&genre=Drama', name: 'Drama Series' },
    ];

    const results = await Promise.allSettled(
      catalogs.map(catalog => this.fetchCatalog(catalog.path, catalog.name, catalog.useKitsu))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sections.push(result.value);
      } else {
        console.warn(`[CineStream] Failed to fetch catalog ${catalogs[index].name}:`, result.reason);
      }
    });

    return { sections };
  }

  async fetchCatalog(path, name, useKitsu = false) {
    const cacheKey = `home:${useKitsu ? 'kitsu' : 'cinemeta'}:${path}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = useKitsu ? this.getKitsuUrl(path) : this.getCinemetaUrl(path);
      const data = await this.fetchJson(url);

      const titles = data.metas.map(meta => this.normalizeCinemetaMeta(meta));
      const section = {
        name,
        titles,
        hasMore: data.hasMore,
      };

      this.setCache(cacheKey, section, 300000);
      return section;
    } catch (error) {
      console.error(`[CineStream] Error fetching catalog ${name}:`, error);
      return { name, titles: [], hasMore: false };
    }
  }

  async search(query) {
    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const encodedQuery = encodeURIComponent(query);
      const endpoints = [
        this.getCinemetaUrl(`/catalog/movie/top/search=${encodedQuery}.json`),
        this.getCinemetaUrl(`/catalog/series/top/search=${encodedQuery}.json`),
        this.getKitsuUrl(`/catalog/anime/kitsu-anime-airing/search=${encodedQuery}.json`),
      ];

      const results = await Promise.allSettled(
        endpoints.map(url => this.fetchJson(url))
      );

      const allTitles = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allTitles.push(...result.value.metas.map(meta => this.normalizeCinemetaMeta(meta)));
        }
      });

      const searchResult = {
        titles: allTitles,
        hasMore: false,
        provider: this.getName(),
      };

      this.setCache(cacheKey, searchResult, 60000);
      return searchResult;
    } catch (error) {
      console.error(`[CineStream] Search error for "${query}":`, error);
      return { titles: [], hasMore: false, provider: this.getName() };
    }
  }

  async fetchDetail(sourceId) {
    const cacheKey = `detail:${sourceId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const isKitsu = sourceId.includes('kitsu') || sourceId.includes('mal');
      const metaUrl = isKitsu ? this.kitsuUrl : this.cinemetaUrl;
      let normalizedId = sourceId;

      if (isKitsu && sourceId.includes('mal:')) {
        normalizedId = sourceId.replace('mal:', '').replace(':', '%3A');
      }

      const type = sourceId.includes('movie') ? 'movie' : 'series';
      const url = `${metaUrl}/meta/${type}/${normalizedId}.json`;
      const data = await this.fetchJson(url);

      if (!data.meta) return null;

      const normalized = this.normalizeCinemetaMeta(data.meta);
      this.setCache(cacheKey, normalized, 300000);
      return normalized;
    } catch (error) {
      console.error(`[CineStream] Error fetching detail for ${sourceId}:`, error);
      return null;
    }
  }

  async fetchEpisodes(sourceId, season) {
    const detail = await this.fetchDetail(sourceId);
    if (!detail || detail.type !== 'series') return [];

    const meta = detail.providerData;
    if (!meta?.videos) return [];

    return meta.videos
      .filter(ep => ep.season === season)
      .map(ep => ({
        id: `${sourceId}:${ep.season}:${ep.episode}`,
        title: ep.name ?? ep.title ?? `Episode ${ep.episode}`,
        type: 'series',
        poster: this.getProxiedImage(ep.thumbnail),
        overview: ep.overview,
        year: ep.firstAired ? parseInt(ep.firstAired.split('-')[0]) : undefined,
        rating: ep.rating ? parseFloat(ep.rating) : undefined,
        source: this.getName(),
        providerData: ep,
      }));
  }

  normalizeCinemetaMeta(meta) {
    const type = meta.type === 'movie' ? 'movie' : 'series';
    const title = meta.aliases?.[0] ?? meta.name ?? '';
    const poster = this.getProxiedImage(meta.poster);
    const backdrop = this.getProxiedImage(meta.background);
    const year = meta.year ? parseInt(meta.year.split('–')[0].split('-')[0]) :
      meta.releaseInfo ? parseInt(meta.releaseInfo.split('–')[0].split('-')[0]) : undefined;
    const rating = meta.imdbRating ? parseFloat(meta.imdbRating) : undefined;
    const genres = meta.genres ?? meta.genre;

    return {
      id: meta.id,
      title,
      type,
      poster,
      backdrop,
      overview: meta.description,
      year,
      genres,
      rating,
      source: this.getName(),
      providerData: meta,
    };
  }
}

providerRegistry.register(new CineStreamProvider());