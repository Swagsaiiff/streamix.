import test from "node:test";
import assert from "node:assert/strict";
import { createResolver } from "./extractor.js";
import { ProviderError } from "./base.js";

const VALID_DETAIL = { id: "tt0000001", type: "movie", title: "Test Title", year: 2000 };

function mockProvider({
  name = "Mock",
  capabilities = { supportsStreamResolution: false },
  detail = VALID_DETAIL,
  fail = []
} = {}) {
  const calls = [];
  const provider = {
    getName: () => name,
    getCapabilities: () => capabilities,
    getDetails: async () => {
      calls.push("#");
      const next = fail.shift();
      if (next) throw new ProviderError(`boom ${next}`, next);
      if (detail === null) return null;
      return detail;
    },
    calls,
    resolveStream: null
  };
  if (capabilities.supportsStreamResolution) {
    provider.resolveStream = async (d) => ({
      url: "https://cdn.example.net/video.mkv",
      headers: { Referer: "https://cdn.example.net/" },
      mediaType: "mkv",
      sourceType: "provider",
      note: null
    });
  }
  return provider;
}

test("rejects invalid type", async () => {
  const resolver = createResolver({ providers: [mockProvider()], fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("video", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
});

test("rejects invalid id", async () => {
  const resolver = createResolver({ providers: [mockProvider()], fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("movie", ""),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
  await assert.rejects(
    () => resolver.resolveStream("movie", "a\u0000b"),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
});

test("fails honestly when no fixture is configured and no extractor exists", async () => {
  const resolver = createResolver({ providers: [mockProvider()], fixturePath: null });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "unsupported"
  );
});

test("falls back to fixture with real detail metadata when resolution is unavailable", async () => {
  const resolver = createResolver({ providers: [mockProvider()], fixturePath: "C:/fixtures/multi-audio.mkv" });
  const stream = await resolver.resolveStream("movie", "tt0000001");
  assert.equal(stream.sourceUrl, "C:/fixtures/multi-audio.mkv");
  assert.equal(stream.sourceType, "local_fixture");
  assert.equal(stream.title, "Test Title");
  assert.equal(stream.year, 2000);
  assert.equal(stream.resolution.status, "fixture_fallback");
  assert.deepEqual(stream.provider, { name: "Mock", resolution: "local_fixture" });
});

test("retries a retryable timeout once and succeeds", async () => {
  const provider = mockProvider({ fail: ["timeout"] });
  const resolver = createResolver({ providers: [provider], fixturePath: "F", retries: 1 });
  const stream = await resolver.resolveStream("movie", "tt0000001");
  assert.equal(provider.calls.length, 2);
  assert.equal(stream.title, "Test Title");
});

test("does not retry or fall back on permanent not_found errors", { timeout: 5000 }, async () => {
  const providerA = mockProvider({ name: "A", detail: null });
  const providerB = mockProvider({ name: "B" });
  const resolver = createResolver({ providers: [providerA, providerB], fixturePath: "F", retries: 3 });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "not_found"
  );
  assert.equal(providerA.calls.length, 1);
  assert.equal(providerB.calls.length, 0);
});

test("falls back to the next provider after retryable exhaustion", { timeout: 10000 }, async () => {
  const providerA = mockProvider({ name: "A", fail: ["timeout"] });
  const providerB = mockProvider({ name: "B" });
  const resolver = createResolver({ providers: [providerA, providerB], fixturePath: "F", retries: 0 });
  const stream = await resolver.resolveStream("movie", "tt0000001");
  assert.equal(providerA.calls.length, 1);
  assert.equal(providerB.calls.length, 1);
  assert.deepEqual(stream.resolution.attemptedProviders, ["A", "B"]);
  assert.equal(stream.provider.name, "B");
});

test("no fallback when all providers fail permanently and no fixture", { timeout: 5000 }, async () => {
  const providerA = mockProvider({ name: "A", detail: null });
  const resolver = createResolver({ providers: [providerA], fixturePath: null, retries: 1 });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "not_found"
  );
});

test("uses a provider extractor when stream resolution is supported", async () => {
  const provider = mockProvider({ capabilities: { supportsStreamResolution: true } });
  const resolver = createResolver({ providers: [provider], fixturePath: "F" });
  const stream = await resolver.resolveStream("movie", "tt0000001");
  assert.equal(stream.resolution.status, "provider_stream");
  assert.equal(stream.sourceUrl, "https://cdn.example.net/video.mkv");
  assert.deepEqual(stream.headers, { Referer: "https://cdn.example.net/" });
  assert.equal(stream.title, "Test Title");
});

test("deduplicates concurrent resolution for the same key", async () => {
  const provider = mockProvider();
  const original = provider.getDetails.bind(provider);
  provider.getDetails = async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return original();
  };
  const resolver = createResolver({ providers: [provider], fixturePath: "F" });
  const [a, b] = await Promise.all([
    resolver.resolveStream("movie", "tt0000001"),
    resolver.resolveStream("movie", "tt0000001")
  ]);
  assert.deepEqual(a, b);
  assert.equal(provider.calls.length, 1);
});
