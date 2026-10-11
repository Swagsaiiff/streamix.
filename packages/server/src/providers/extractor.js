import { ProviderError } from "./base.js";

function validateType(type) {
  return type === "movie" || type === "series" ? type : null;
}

function validateId(id) {
  if (id == null || typeof id !== "string") return null;
  if (id.length < 1 || id.length > 128) return null;
  if (/[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}

export function createResolver({ provider, fixturePath }) {
  return {
    async resolveStream(type, id) {
      const validType = validateType(type);
      if (!validType) {
        throw new ProviderError("Type must be 'movie' or 'series'", "validation");
      }
      const validId = validateId(id);
      if (!validId) {
        throw new ProviderError("Invalid id parameter", "validation");
      }

      const detail = await provider.getDetails(validType, validId);
      if (!detail) {
        throw new ProviderError(`No detail found for ${type}/${id}`, "not_found");
      }

      const capabilities = provider.getCapabilities();
      if (capabilities.supportsStreamResolution === true) {
        throw new ProviderError(
          "provider stream resolution is not implemented for this provider yet",
          "unsupported"
        );
      }

      if (!fixturePath) {
        throw new ProviderError(
          "provider stream resolution is not available and no local test fixture is configured",
          "unsupported"
        );
      }

      return {
        sourceUrl: fixturePath,
        headers: {},
        sourceType: "local_fixture",
        mediaType: "mkv",
        title: detail.title,
        year: detail.year,
        note: "Provider stream resolution is not implemented yet; playing the local test fixture"
      };
    }
  };
}