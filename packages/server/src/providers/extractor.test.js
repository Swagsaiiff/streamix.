import test from "node:test";
import assert from "node:assert/strict";
import { createResolver } from "./extractor.js";
import { ProviderError } from "./base.js";

function fakeProvider({ canResolve = false } = {}) {
  return {
    async getDetails(type, id) {
      if (id === "tt0000001") {
        return { id, type, title: "Test Title", year: 2000 };
      }
      return null;
    },
    getCapabilities() {
      return { supportsStreamResolution: canResolve };
    }
  };
}

test("rejects invalid type", async () => {
  const resolver = createResolver({ provider: fakeProvider(), fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("video", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
});

test("rejects invalid id", async () => {
  const resolver = createResolver({ provider: fakeProvider(), fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("movie", ""),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
  await assert.rejects(
    () => resolver.resolveStream("movie", "a\u0000b"),
    (err) => err instanceof ProviderError && err.code === "validation"
  );
});

test("reports when provider stream resolution is unimplemented", async () => {
  const resolver = createResolver({ provider: fakeProvider({ canResolve: true }), fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "unsupported"
  );
});

test("fails honestly when no fixture is configured", async () => {
  const resolver = createResolver({ provider: fakeProvider(), fixturePath: null });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt0000001"),
    (err) => err instanceof ProviderError && err.code === "unsupported" && err.message.includes("no local test fixture")
  );
});

test("returns the local fixture with real detail metadata when resolution is unavailable", async () => {
  const resolver = createResolver({ provider: fakeProvider(), fixturePath: "C:/fixtures/multi-audio.mkv" });
  const stream = await resolver.resolveStream("movie", "tt0000001");
  assert.equal(stream.sourceUrl, "C:/fixtures/multi-audio.mkv");
  assert.equal(stream.sourceType, "local_fixture");
  assert.equal(stream.title, "Test Title");
  assert.equal(stream.year, 2000);
  assert.ok(stream.note.includes("not implemented"));
});

test("throws when detail does not exist", async () => {
  const resolver = createResolver({ provider: fakeProvider(), fixturePath: "F" });
  await assert.rejects(
    () => resolver.resolveStream("movie", "tt9999999"),
    (err) => err instanceof ProviderError && err.code === "not_found"
  );
});