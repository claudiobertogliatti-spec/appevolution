import express from "express";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { Storage } from "@google-cloud/storage";
import { existsSync, mkdirSync } from "fs";
import { randomBytes } from "crypto";

const app = express();
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 8090;
const GCS_BUCKET = process.env.GCS_BUCKET || "gen-lang-client-0744698012_cloudbuild";
const BUNDLE_PATH = process.env.REMOTION_BUNDLE_PATH || "/app/bundle/index.html";

const storage = new Storage();

app.get("/health", (_, res) => res.json({ ok: true, bundle: existsSync(BUNDLE_PATH) }));

app.post("/render", async (req, res) => {
  const { props, outputGcsPath } = req.body;

  if (!props || !outputGcsPath) {
    return res.status(400).json({ error: "props e outputGcsPath obbligatori" });
  }

  if (!props.videoUrl || !props.partnerName || !props.durationInSeconds) {
    return res.status(400).json({ error: "props.videoUrl, partnerName, durationInSeconds obbligatori" });
  }

  const jobId = randomBytes(6).toString("hex");
  const tmpOut = `/tmp/render_${jobId}.mp4`;
  mkdirSync("/tmp", { recursive: true });

  console.log(`[RENDER] Start job ${jobId} — ${props.partnerName} (${props.durationInSeconds}s)`);
  const startTime = Date.now();

  try {
    // Selezione composition con calcolo durata dai props
    const comp = await selectComposition({
      serveUrl: BUNDLE_PATH,
      id: "PartnerVideo",
      inputProps: props,
    });

    await renderMedia({
      composition: comp,
      serveUrl: BUNDLE_PATH,
      codec: "h264",
      outputLocation: tmpOut,
      inputProps: props,
      concurrency: 2,
      videoBitrate: "8M",
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) {
          console.log(`[RENDER] ${jobId} — ${pct}% (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }
      },
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[RENDER] ${jobId} completato in ${elapsed}s`);

    // Upload su GCS
    await storage.bucket(GCS_BUCKET).upload(tmpOut, {
      destination: outputGcsPath,
      metadata: { contentType: "video/mp4" },
    });

    // URL firmato valido 2 ore per il download da Python
    const [signedUrl] = await storage
      .bucket(GCS_BUCKET)
      .file(outputGcsPath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 2 * 60 * 60 * 1000,
      });

    console.log(`[RENDER] Uploaded → gs://${GCS_BUCKET}/${outputGcsPath}`);
    res.json({ success: true, gcsPath: outputGcsPath, downloadUrl: signedUrl, elapsedSec: elapsed });

  } catch (err) {
    console.error(`[RENDER] Error job ${jobId}:`, err);
    res.status(500).json({ error: String(err), jobId });
  }
});

app.listen(PORT, () => {
  console.log(`Remotion service listening on :${PORT}`);
  console.log(`Bundle path: ${BUNDLE_PATH} (exists: ${existsSync(BUNDLE_PATH)})`);
});
