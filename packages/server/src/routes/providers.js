import { Router } from "express";
import { getProviderStatuses } from "../providers/index.js";

export function providersRouter() {
  const router = Router();

  router.get("/providers/status", (_req, res) => {
    res.json({
      checkedAt: new Date().toISOString(),
      playback: {
        verifiedRealProviderPlayback: false,
        blocker: "No provider extractor has been ported; stream resolution falls back to a local test fixture"
      },
      providers: getProviderStatuses()
    });
  });

  return router;
}