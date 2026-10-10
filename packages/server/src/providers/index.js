import { CineStreamProvider } from "./cinemeta.js";
import { ProviderError } from "./base.js";

const registry = new Map([["CineStream", CineStreamProvider]]);

export function createProvider(name = "CineStream", options = {}) {
  const ProviderClass = registry.get(name);
  if (!ProviderClass) {
    throw new ProviderError(`unknown provider: ${name}`, "unsupported");
  }
  return new ProviderClass(options);
}

export function listProviders() {
  return Array.from(registry.keys()).map((name) => ({ name, supported: true }));
}
