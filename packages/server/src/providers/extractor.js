import { ProviderError, isRetryableError } from "./base.js";

const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 200;

function validateType(type) {
  return type === "movie" || type === "series" ? type : null;
}

function validateId(id) {
  if (id == null || typeof id !== "string") return null;
  if (id.length < 1 || id.length > 128) return null;
  if (/[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createResolver({
  providers = [],
  fixturePath = null,
  retries = DEFAULT_RETRIES
} = {}) {
  const inFlight = new Map();

  async function getDetailWithRetries(provider, type, id) {
    let attempt = 0;
    for (;;) {
      try {
        const detail = await provider.getDetails(type, id);
        if (!detail) {
          throw new ProviderError(`No detail found for ${type}/${id}`, "not_found");
        }
        return detail;
      } catch (err) {
        if (isRetryableError(err) && attempt < retries) {
          attempt += 1;
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        throw err;
      }
    }
  }

  async function doResolve(type, id, { preferredLanguage = null } = {}) {
    const validType = validateType(type);
    if (!validType) {
      throw new ProviderError("Type must be 'movie' or 'series'", "validation");
    }
    const validId = validateId(id);
    if (!validId) {
      throw new ProviderError("Invalid id parameter", "validation");
    }

    const attemptedProviders = [];
    let lastError = null;
    let resolvedDetail = null;
    let resolvedProviderName = null;

    for (const provider of providers) {
      attemptedProviders.push(provider.getName());
      let detail = null;
      try {
        detail = await getDetailWithRetries(provider, validType, validId);
      } catch (err) {
        if (!isRetryableError(err)) {
          throw err;
        }
        lastError = err;
        continue;
      }
      resolvedDetail = detail;
      resolvedProviderName = provider.getName();

      const capabilities = provider.getCapabilities();
      if (capabilities.supportsStreamResolution === true && typeof provider.resolveStream === "function") {
        const source = await provider.resolveStream(detail, { preferredLanguage });
        return {
          provider: { name: provider.getName(), resolution: "provider_stream" },
          resolution: {
            status: "provider_stream",
            attemptedProviders,
            sourceType: source.sourceType ?? "provider"
          },
          sourceUrl: source.url,
          headers: source.headers ?? {},
          mediaType: source.mediaType ?? null,
          title: detail.title,
          year: detail.year,
          note: source.note ?? null
        };
      }

      lastError = new ProviderError(
        `${provider.getName()} stream resolution is not implemented`,
        "unsupported"
      );
    }

    if (fixturePath) {
      return {
        provider: { name: resolvedProviderName ?? null, resolution: "local_fixture" },
        resolution: {
          status: "fixture_fallback",
          attemptedProviders,
          note: "No provider stream resolution is available; playing the local test fixture"
        },
        sourceUrl: fixturePath,
        headers: {},
        sourceType: "local_fixture",
        mediaType: "mkv",
        title: resolvedDetail?.title ?? null,
        year: resolvedDetail?.year ?? null,
        note: "Provider stream resolution is not implemented yet; playing the local test fixture"
      };
    }

    throw lastError ?? new ProviderError("no compatible provider configured", "unsupported");
  }

  function resolveStream(type, id, options) {
    const key = `${type}:${id}`;
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }
    const promise = doResolve(type, id, options).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  }

  return { resolveStream };
}
