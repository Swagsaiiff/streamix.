export class NormalizedTitle {
  constructor(data = {}) {
    this.id = data.id ?? '';
    this.title = data.title ?? '';
    this.type = data.type ?? 'movie';
    this.poster = data.poster;
    this.backdrop = data.backdrop;
    this.overview = data.overview;
    this.year = data.year;
    this.genres = data.genres;
    this.rating = data.rating;
    this.source = data.source ?? '';
    this.sourceUrl = data.sourceUrl;
    this.providerData = data.providerData;
    this.tmdbId = data.tmdbId;
  }
}

export class SearchResult {
  constructor(data = {}) {
    this.titles = data.titles ?? [];
    this.hasMore = data.hasMore ?? false;
    this.provider = data.provider ?? '';
  }
}

export class HomeSection {
  constructor(data = {}) {
    this.name = data.name ?? '';
    this.titles = data.titles ?? [];
    this.hasMore = data.hasMore ?? false;
  }
}

export class HomePageResponse {
  constructor(data = {}) {
    this.sections = data.sections ?? [];
  }
}

export class ProviderConfig {
  constructor(data = {}) {
    this.name = data.name ?? '';
    this.baseUrl = data.baseUrl ?? '';
    this.timeoutMs = data.timeoutMs ?? 15000;
    this.headers = data.headers ?? {};
  }
}

export class ProviderCapabilities {
  constructor(data = {}) {
    this.supportsHomePage = data.supportsHomePage ?? false;
    this.supportsSearch = data.supportsSearch ?? false;
    this.supportsDetail = data.supportsDetail ?? false;
    this.supportsEpisodes = data.supportsEpisodes ?? false;
    this.supportedTypes = data.supportedTypes ?? ['movie', 'series'];
  }
}

export class BaseProvider {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.defaultTtlMs = 300000;
  }

  getCapabilities() {
    throw new Error('getCapabilities() must be implemented');
  }

  getName() {
    throw new Error('getName() must be implemented');
  }

  async fetchHomePage() {
    throw new Error('fetchHomePage() must be implemented');
  }

  async search(query) {
    throw new Error('search() must be implemented');
  }

  async fetchDetail(sourceId) {
    throw new Error('fetchDetail() must be implemented');
  }

  async fetchEpisodes(sourceId, season) {
    throw new Error('fetchEpisodes() must be implemented');
  }

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'STREAMIX/1.0',
          'Accept': 'application/json',
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  getCached(key) {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data, ttlMs = this.defaultTtlMs) {
    this.cache.set(key, { data, expires: Date.now() + ttlMs });
  }

  normalizeTitle(raw, providerName) {
    const id = String(raw.id ?? '');
    const title = String(raw.title ?? raw.name ?? '');
    const typeRaw = String(raw.type ?? '').toLowerCase();
    const type = typeRaw === 'movie' ? 'movie' : 'series';

    return {
      id,
      title,
      type,
      poster: raw.poster,
      backdrop: raw.backdrop,
      overview: raw.overview ?? raw.description,
      year: raw.year ?? (raw.releaseInfo ? parseInt(String(raw.releaseInfo).split('-')[0]) : undefined),
      genres: raw.genres ?? raw.genre,
      rating: raw.rating ?? (raw.imdbRating ? parseFloat(String(raw.imdbRating)) : undefined),
      source: providerName,
      sourceUrl: raw.sourceUrl,
      providerData: raw,
    };
  }
}

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.getName(), provider);
  }

  get(name) {
    return this.providers.get(name);
  }

  getAll() {
    return Array.from(this.providers.values());
  }

  getEnabled() {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();