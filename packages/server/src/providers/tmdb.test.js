import test from "node:test";
import assert from "node:assert/strict";
import { matchesYear, createTmdbEnricher } from "./tmdb.js";

test("matchesYear within tolerance", () => {
  assert.equal(matchesYear(2008, 2009), true);
  assert.equal(matchesYear(2008, 2010), false);
  assert.equal(matchesYear(null, 2008), false);
});

test("enricher is disabled without a key and passes items through", async () => {
  const { enrich, isEnabled } = createTmdbEnricher({ apiKey: "", cache: undefined });
  assert.equal(isEnabled, false);
  const result = await enrich([{ id: "x", title: "Batman", year: 1989 }]);
  assert.equal(result.status, "disabled");
  assert.equal(result.reason, "no_tmdb_key");
  assert.equal(result.matched, 0);
  assert.deepEqual(result.items, [{ id: "x", title: "Batman", year: 1989 }]);
});
