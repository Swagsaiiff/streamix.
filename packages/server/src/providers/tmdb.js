import { providerRegistry } from './base.js';

const DEFAULT_GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export class TmdbEnricher {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.TMDB_API_KEY,
      baseUrl: config.baseUrl ?? 'https://api.themoviedb.org/3',
      language: config.language ?? 'en-US',
      cacheTtlMs: config.cacheTtlMs ?? 86400000,
    };
    this.cache = new Map();
    this.genreMap = { ...DEFAULT_GENRE_MAP };
    this.genreMapFetched = false;
  }

  isEnabled() {
    return !!this.config.apiKey;
  }

  getCacheKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  getCached(key) {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, expires: Date.now() + this.config.cacheTtlMs });
  }

  async fetchJson(endpoint, params = {}) {
    if (!this.config.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.config.apiKey);
    url.searchParams.set('language', this.config.language);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('TMDB API key invalid');
        }
        if (response.status === 404) {
          return null;
        }
        throw new Error(`TMDB HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async ensureGenreMap() {
    if (this.genreMapFetched) return;

    const cacheKey = this.getCacheKey('genres', 'movie');
    const cached = this.getCached(cacheKey);
    if (cached) {
      this.genreMap = { ...DEFAULT_GENRE_MAP, ...cached };
      this.genreMapFetched = true;
      return;
    }

    try {
      const [movieGenres, tvGenres] = await Promise.all([
        this.fetchJson('/genre/movie/list'),
        this.fetchJson('/genre/tv/list'),
      ]);

      const merged = { ...DEFAULT_GENRE_MAP };
      [...(movieGenres?.genres ?? []), ...(tvGenres?.genres ?? [])].forEach(g => {
        merged[g.id] = g.name;
      });

      this.genreMap = merged;
      this.setCache(cacheKey, merged);
      this.genreMapFetched = true;
    } catch (error) {
      console.warn('[TMDB] Failed to fetch genre map, using defaults:', error);
      this.genreMapFetched = true;
    }
  }

  mapGenreIds(ids) {
    if (!ids?.length) return [];
    return ids.map(id => this.genreMap[id]).filter(Boolean);
  }

  buildImageUrl(path, size = 'w500') {
    if (!path) return undefined;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  async searchMovie(title, year) {
    if (!this.isEnabled()) return null;

    const cacheKey = this.getCacheKey('search', 'movie', title.toLowerCase(), String(year ?? ''));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = { query: title, include_adult: 'false' };
      if (year) params.year = String(year);

      const response = await this.fetchJson('/search/movie', params);
      const result = response?.results?.[0] ?? null;
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn(`[TMDB] Movie search failed for "${title}":`, error);
      return null;
    }
  }

  async searchTv(title, year) {
    if (!this.isEnabled()) return null;

    const cacheKey = this.getCacheKey('search', 'tv', title.toLowerCase(), String(year ?? ''));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = { query: title, include_adult: 'false' };
      if (year) params.first_air_date_year = String(year);

      const response = await this.fetchJson('/search/tv', params);
      const result = response?.results?.[0] ?? null;
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn(`[TMDB] TV search failed for "${title}":`, error);
      return null;
    }
  }

  async getMovieDetails(tmdbId) {
    if (!this.isEnabled()) return null;

    const cacheKey = this.getCacheKey('detail', 'movie', String(tmdbId));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchJson(`/movie/${tmdbId}`, {
        append_to_response: 'credits,videos,images',
      });
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.warn(`[TMDB] Movie detail failed for ${tmdbId}:`, error);
      return null;
    }
  }

  async getTvDetails(tmdbId) {
    if (!this.isEnabled()) return null;

    const cacheKey = this.getCacheKey('detail', 'tv', String(tmdbId));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchJson(`/tv/${tmdbId}`, {
        append_to_response: 'credits,videos,images',
      });
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.warn(`[TMDB] TV detail failed for ${tmdbId}:`, error);
      return null;
    }
  }

  async enrichTitle(title, type, year) {
    if (!this.isEnabled()) return null;

    await this.ensureGenreMap();

    const searchResult = type === 'movie'
      ? await this.searchMovie(title, year)
      : await this.searchTv(title, year);

    if (!searchResult) return null;

    const detail = type === 'movie'
      ? await this.getMovieDetails(searchResult.id)
      : await this.getTvDetails(searchResult.id);

    if (!detail) return null;

    return {
      tmdbId: detail.id,
      poster: this.buildImageUrl(detail.poster_path),
      backdrop: this.buildImageUrl(detail.backdrop_path, 'w1280'),
      overview: detail.overview ?? searchResult.overview,
      rating: detail.vote_average,
      genres: this.mapGenreIds(detail.genres?.map(g => g.id) ?? searchResult.genre_ids),
      year: type === 'movie'
        ? detail.release_date ? parseInt(detail.release_date.split('-')[0]) : year
        : detail.first_air_date ? parseInt(detail.first_air_date.split('-')[0]) : year,
    };
  }
}

export const tmdbEnricher = new TmdbEnricher();