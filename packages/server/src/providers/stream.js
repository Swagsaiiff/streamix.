import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, mkdir, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TEMP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "temp", "hls");
const HLS_TIME = 4;
const MASTER_PLAYLIST = "master.m3u8";
const SEGMENT_NAME_RE = /^[A-Za-z0-9._-]+$/;

const activeSessions = new Map();
let pendingQueue = [];
let activeTranscodes = 0;

export async function initHlsDir() {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
  } catch {
    // Directory creation can fail if it already exists
  }
}

function runProcess(bin, args, { cwd, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { cwd, windowsHide: true });
    let stderr = "";
    let timedOut = false;
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`failed to spawn ${bin}: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${bin} timed out after ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${bin} exited with code ${code}: ${stderr.trim().slice(0, 500)}`));
        return;
      }
      resolve();
    });
  });
}

function probeStreams(ffprobePath, sourceUrl) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      ffprobePath,
      ["-v", "error", "-print_format", "json", "-show_streams", sourceUrl],
      { windowsHide: true }
    );
    let out = "";
    let err = "";
    proc.stdout.on("data", (data) => {
      out += data.toString();
    });
    proc.stderr.on("data", (data) => {
      err += data.toString();
    });
    proc.on("error", (e) => reject(new Error(`failed to spawn ffprobe: ${e.message}`)));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${err.slice(0, 300)}`));
        return;
      }
      try {
        const parsed = JSON.parse(out);
        const streams = parsed.streams ?? [];
        const videoIndex = streams.findIndex((s) => s.codec_type === "video");
        const audios = streams.filter((s) => s.codec_type === "audio");
        resolve({ videoIndex, audios });
      } catch {
        reject(new Error("invalid ffprobe output"));
      }
    });
  });
}

export function buildAudioLayout(audios, preferredLanguage = null) {
  const parts = ["v:0,agroup:aud,name:v0"];
  const matchedIndex = preferredLanguage
    ? audios.findIndex((audio) => (audio.tags?.language ?? null) === preferredLanguage)
    : -1;
  const defaultIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const tracks = audios.map((audio, i) => {
    const tags = audio.tags ?? {};
    const language = tags.language || null;
    const name = tags.title || tags.language || `Audio ${i + 1}`;
    let rendition = `a:${i},agroup:aud,name:a${i},default:${i === defaultIndex ? "yes" : "no"}`;
    if (language) rendition += `,language:${language}`;
    parts.push(rendition);
    return { trackId: i, name, language, default: i === defaultIndex, codec: audio.codec_name || null };
  });
  return { layout: parts.join(" "), tracks, defaultTrackIndex: defaultIndex };
}

export function createStreamManager({ ffmpegPath = "ffmpeg", ffprobePath = "ffprobe", maxConcurrent = 2 }) {
  function pump() {
    while (activeTranscodes < maxConcurrent && pendingQueue.length > 0) {
      const job = pendingQueue.shift();
      activeTranscodes += 1;
      job.fn().then(job.resolve, job.reject).finally(() => {
        activeTranscodes -= 1;
        pump();
      });
    }
  }

  function enqueue(fn) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ fn, resolve, reject });
      pump();
    });
  }

  async function cleanupSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    if (session.proc && session.proc.exitCode === null) {
      try {
        session.proc.kill("SIGTERM");
      } catch {
        // Process already exited
      }
    }

    try {
      await rm(session.hlsDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    activeSessions.delete(sessionId);
  }

  async function createSession(sourceUrl, { timeoutMs = 1800000, preferredLanguage = null } = {}) {
    const sessionId = createHash("sha256").update(`${sourceUrl}:${Date.now()}:${Math.random()}`).digest("hex");
    const sessionDir = join(TEMP_DIR, sessionId);
    await mkdir(sessionDir, { recursive: true });

    const session = {
      sessionId,
      sourceUrl,
      hlsDir: sessionDir,
      proc: null,
      status: "pending",
      createdAt: Date.now(),
      preferredLanguage,
      audioTracks: [],
      error: null
    };
    activeSessions.set(sessionId, session);

    return enqueue(async () => {
      try {
        session.status = "probing";
        const { videoIndex, audios } = await probeStreams(ffprobePath, sourceUrl);
        if (videoIndex < 0) throw new Error("no video stream found in source");
        if (audios.length === 0) throw new Error("no audio streams found in source");

        const { layout, tracks } = buildAudioLayout(audios, preferredLanguage);
        session.audioTracks = tracks;

        const args = [
          "-y", "-hide_banner", "-loglevel", "error",
          "-i", sourceUrl,
          "-map", "0:v:0",
          ...audios.map((_, i) => ["-map", `0:a:${i}`]).flat(),
          "-c:v", "libx264",
          "-c:a", "aac",
          "-f", "hls",
          "-hls_time", String(HLS_TIME),
          "-hls_playlist_type", "vod",
          "-hls_flags", "independent_segments",
          "-master_pl_name", MASTER_PLAYLIST,
          "-var_stream_map", layout,
          "-hls_segment_filename", "seg_%v_%03d.ts",
          "index_%v.m3u8"
        ];

        session.status = "converting";
        const proc = spawn(ffmpegPath, args, { cwd: sessionDir, windowsHide: true });
        session.proc = proc;

        let stderr = "";
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        await new Promise((resolveSession, rejectSession) => {
          const timer = setTimeout(() => {
            proc.kill("SIGTERM");
            rejectSession(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          proc.on("error", (err) => {
            clearTimeout(timer);
            rejectSession(new Error(`failed to spawn ffmpeg: ${err.message}`));
          });
          proc.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) {
              resolveSession();
            } else {
              rejectSession(new Error(`ffmpeg exited with code ${code}: ${stderr.trim().slice(0, 500)}`));
            }
          });
        });

        session.status = "ready";
        return session;
      } catch (err) {
        session.error = err.message;
        await cleanupSession(sessionId);
        throw err;
      }
    });
  }

  async function getSession(sessionId) {
    return activeSessions.get(sessionId) ?? null;
  }

  async function getMasterPlaylist(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== "ready") {
      throw new Error("Session not ready or not found");
    }
    const content = await readFile(join(session.hlsDir, MASTER_PLAYLIST), "utf8");
    return {
      content,
      audioTracks: session.audioTracks,
      playlistUrl: `/api/stream/${sessionId}/master.m3u8`,
      sessionId
    };
  }

  async function resolveFile(sessionId, filename) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== "ready") {
      throw new Error("Session not ready or not found");
    }
    if (!SEGMENT_NAME_RE.test(filename)) {
      throw new Error("Invalid file name");
    }
    const full = join(session.hlsDir, filename);
    await access(full);
    return full;
  }

  return {
    initHlsDir,
    createSession,
    getSession,
    getMasterPlaylist,
    resolveFile,
    cleanupSession,
    getActiveSessionCount: () => activeSessions.size
  };
}
