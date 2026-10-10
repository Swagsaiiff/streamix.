export class ProviderError extends Error {
  constructor(message, code = "provider_error", cause) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export class BaseProvider {
  constructor({ name, timeoutMs = 15000 } = {}) {
    this.name = name;
    this.timeoutMs = timeoutMs;
  }

  getUserAgent() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  }

  async fetchText(url, { timeoutMs = this.timeoutMs, headers = {} } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": this.getUserAgent(), Accept: "application/json", ...headers },
        signal: controller.signal
      });
      if (!res.ok) {
        throw new ProviderError(`upstream responded ${res.status} for ${url}`, "http");
      }
      return await res.text();
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err.name === "AbortError") {
        throw new ProviderError(`request timed out after ${timeoutMs}ms: ${url}`, "timeout", err);
      }
      throw new ProviderError(`network error: ${err.message}`, "network", err);
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchJson(url, options) {
    const text = await this.fetchText(url, options);
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new ProviderError("invalid JSON from upstream", "parse", err);
    }
  }
}
