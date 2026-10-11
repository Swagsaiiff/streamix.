import { CineStreamProvider } from "./cinemeta.js";
import { ProviderError } from "./base.js";

const registry = new Map([["CineStream", CineStreamProvider]]);
const telemetry = new Map();

function recordOutcome(providerName, outcome) {
  const entry =
    telemetry.get(providerName) ?? {
      providerName,
      successes: 0,
      failures: 0,
      lastSuccessAt: null,
      lastErrorCode: null,
      lastErrorAt: null
    };
  if (outcome.ok) {
    entry.successes += 1;
    entry.lastSuccessAt = outcome.at;
  } else {
    entry.failures += 1;
    entry.lastErrorCode = outcome.code;
    entry.lastErrorAt = outcome.at;
  }
  telemetry.set(providerName, entry);
}

export function createProvider(name = "CineStream", options = {}) {
  const ProviderClass = registry.get(name);
  if (!ProviderClass) {
    throw new ProviderError(`unknown provider: ${name}`, "unsupported");
  }
  return new ProviderClass({ ...options, onOutcome: (outcome) => recordOutcome(name, outcome) });
}

export function listConfiguredProviders(options = {}) {
  return Array.from(registry.keys()).map((name) => createProvider(name, options));
}

export function getProviderStatuses() {
  return Array.from(registry.keys()).map((name) => {
    const ProviderClass = registry.get(name);
    const probe = new ProviderClass({});
    const capabilities = probe.getCapabilities();
    const t = telemetry.get(name);
    return {
      name,
      configured: true,
      verifiedRealPlayback: false,
      capabilities,
      telemetry: t ?? {
        successes: 0,
        failures: 0,
        lastSuccessAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    };
  });
}