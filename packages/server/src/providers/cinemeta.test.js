import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMeta } from "./cinemeta.js";

const richMeta = {
  id: "tt6933238",
  type: "movie",
  name: "Unabomber",
  year: "2026",
  releaseInfo: "2026",
  imdbRating: "6.2",
  genre: ["Biography", "Crime", "Drama"],
  description: "A Harvard student becomes the Unabomber.",
  poster: "https://images.metahub.space/poster/small/tt6933238/img",
  background: "https://images.metahub.space/background/medium/tt6933238/img",
  popularity: 2.35
};

test("normalizes a rich top-catalog meta", () => {
  const item = normalizeMeta(richMeta);
  assert.equal(item.id, "tt6933238");
  assert.equal(item.title, "Unabomber");
  assert.equal(item.type, "movie");
  assert.equal(item.year, 2026);
  assert.equal(item.rating, 6.2);
  assert.deepEqual(item.genres, ["Biography", "Crime", "Drama"]);
  assert.equal(item.overview, "A Harvard student becomes the Unabomber.");
  assert.equal(item.popularity, 2.35);
  assert.equal(item.source, "CineStream");
  assert.ok(item.sourceUrl.endsWith("movie/tt6933238.json"));
});

test("metahub posters are routed through the image proxy", () => {
  const item = normalizeMeta(richMeta);
  assert.equal(item.poster, "https://wsrv.nl/?url=https://images.metahub.space/poster/small/tt6933238/img");
});

test("sparse search metas keep missing fields null", () => {
  const item = normalizeMeta({
    id: "tt0903747",
    type: "series",
    name: "Breaking Bad",
    releaseInfo: "2008-2013",
    poster: "https://m.media-amazon.com/images/M/foo.jpg"
  });
  assert.equal(item.year, 2008);
  assert.equal(item.rating, null);
  assert.equal(item.overview, null);
  assert.equal(item.genres, null);
  assert.equal(item.poster, "https://m.media-amazon.com/images/M/foo.jpg");
  assert.equal(item.type, "series");
});

test("empty imdbRating becomes a null rating", () => {
  const item = normalizeMeta({ id: "x", type: "movie", name: "T", imdbRating: "" });
  assert.equal(item.rating, null);
});

test("aliases take precedence over name", () => {
  const item = normalizeMeta({ id: "x", type: "series", name: "Batman", aliases: ["Batman (1989)"] });
  assert.equal(item.title, "Batman (1989)");
});

test("non-movie types normalize to series", () => {
  assert.equal(normalizeMeta({ id: "x", type: "movie", name: "M" }).type, "movie");
  assert.equal(normalizeMeta({ id: "x", type: "series", name: "S" }).type, "series");
  assert.equal(normalizeMeta({ id: "kitsu:11", type: "series", name: "Naruto" }).type, "series");
});
