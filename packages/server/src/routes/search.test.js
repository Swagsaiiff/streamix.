import test from "node:test";
import assert from "node:assert/strict";
import { mergeSearchResults } from "./search.js";

function item(overrides) {
  return {
    id: "x",
    title: "Title",
    type: "movie",
    year: 2020,
    provider: "CineStream",
    ...overrides
  };
}

test("mergeSearchResults keeps results from every provider without dropping slower ones", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [item({ id: "tt1", title: "Alpha", year: 2001 })] },
    { provider: "VegaMovies", items: [item({ id: "/beta/", title: "Beta", year: 2020, provider: "VegaMovies" })] }
  ]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((i) => i.provider).sort(), ["CineStream", "VegaMovies"]);
});

test("mergeSearchResults dedupes identical titles from different providers", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [item({ id: "tt1", title: "Beast of War", year: 2025 })] },
    { provider: "VegaMovies", items: [item({ id: "/beast/", title: "Beast of War", year: 2025, provider: "VegaMovies" })] }
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].provider, "CineStream");
});

test("mergeSearchResults keeps different years (remakes) as separate titles", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [item({ id: "tt-old", title: "Dune", year: 1984 })] },
    { provider: "VegaMovies", items: [item({ id: "/dune-2021/", title: "Dune", year: 2021, provider: "VegaMovies" })] }
  ]);
  assert.equal(merged.length, 2);
});

test("mergeSearchResults does not merge a movie with a series of the same name", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [item({ id: "tt-m", title: "Fargo", year: 1996, type: "movie" })] },
    { provider: "CineStream", items: [item({ id: "tt-s", title: "Fargo", year: 1996, type: "series" })] }
  ]);
  assert.equal(merged.length, 2);
});

test("mergeSearchResults normalizes punctuation and case for dedupe", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [item({ id: "a", title: "Spider-Man: No Way Home", year: 2021 })] },
    { provider: "VegaMovies", items: [item({ id: "b", title: "Spider Man No Way Home", year: 2021, provider: "VegaMovies" })] }
  ]);
  assert.equal(merged.length, 1);
});

test("mergeSearchResults tolerates empty provider result sets", () => {
  const merged = mergeSearchResults([
    { provider: "CineStream", items: [] },
    { provider: "VegaMovies", items: [item({ id: "/only/", provider: "VegaMovies" })] }
  ]);
  assert.equal(merged.length, 1);
});