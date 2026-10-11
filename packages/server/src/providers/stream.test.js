import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createStreamManager, initHlsDir } from "./stream.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixturePath = resolve(repoRoot, "temp", "fixtures", "multi-audio.mkv");

function ensureFixture() {
  if (!existsSync(fixturePath)) {
    const result = spawnSync(process.execPath, [resolve(repoRoot, "scripts", "make-test-fixture.mjs")], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status !== 0) {
      throw new Error(`fixture generation failed: ${result.stderr || result.error?.message}`);
    }
  }
}

test("probe and HLS session exposes two real audio tracks", { timeout: 60000 }, async () => {
  ensureFixture();
  await initHlsDir();
  const manager = createStreamManager({ maxConcurrent: 1 });
  const session = await manager.createSession(fixturePath);

  assert.equal(session.status, "ready");
  assert.equal(session.audioTracks.length, 2);
  assert.equal(session.audioTracks[0].default, true);
  assert.equal(session.audioTracks[1].default, false);

  const { content } = await manager.getMasterPlaylist(session.sessionId);
  assert.match(content, /#EXT-X-MEDIA:TYPE=AUDIO/);
  assert.equal((content.match(/#EXT-X-MEDIA:TYPE=AUDIO/g) ?? []).length, 2);
  assert.match(content, /#EXT-X-STREAM-INF:.*AUDIO="group_aud"/);

  const videoPlaylist = await manager.resolveFile(session.sessionId, "index_v0.m3u8");
  assert.ok(videoPlaylist.length > 0);
  await manager.cleanupSession(session.sessionId);
  assert.equal(await manager.getSession(session.sessionId), null);
});

test("rejects invalid file names", { timeout: 30000 }, async () => {
  ensureFixture();
  await initHlsDir();
  const manager = createStreamManager({ maxConcurrent: 1 });
  const session = await manager.createSession(fixturePath);
  await assert.rejects(() => manager.resolveFile(session.sessionId, "../secret.txt"));
  await assert.rejects(() => manager.resolveFile(session.sessionId, "a/b.ts"));
  await manager.cleanupSession(session.sessionId);
});

test("fails cleanly when the source cannot be opened", { timeout: 60000 }, async () => {
  await initHlsDir();
  const manager = createStreamManager({ maxConcurrent: 1 });
  await assert.rejects(() => manager.createSession(resolve(repoRoot, "temp", "does-not-exist.mkv")));
  assert.equal(activeSessionCount(manager), 0);
});

function activeSessionCount(manager) {
  return manager.getActiveSessionCount ? manager.getActiveSessionCount() : 0;
}
