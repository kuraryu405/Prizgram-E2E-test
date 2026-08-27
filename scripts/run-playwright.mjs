import { spawn } from "node:child_process";
import { readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const resultsDir = join(root, "artifacts", "test-results");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function assertFfmpeg() {
  const code = await run("ffmpeg", ["-version"], { stdio: "ignore" });
  if (code !== 0) {
    throw new Error(
      "ffmpeg is required to convert Playwright WebM recordings to MP4.",
    );
  }
}

async function convertVideos() {
  await assertFfmpeg();
  const webmFiles = (await walk(resultsDir)).filter((path) => path.endsWith(".webm"));

  for (const webm of webmFiles) {
    const finalMp4 = webm.replace(/\.webm$/, ".mp4");
    const tempMp4 = `${finalMp4}.tmp.mp4`;
    const code = await run("ffmpeg", [
      "-y",
      "-i",
      webm,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      tempMp4,
    ]);
    if (code !== 0) {
      await rm(tempMp4, { force: true });
      throw new Error(`ffmpeg failed for ${webm}`);
    }
    await rename(tempMp4, finalMp4);
    await rm(webm);
    process.stdout.write(`MP4 evidence: ${finalMp4}\n`);
  }
}

const playwrightArgs = process.argv.slice(2);
const testCode = await run("pnpm", ["exec", "playwright", "test", ...playwrightArgs]);

try {
  await convertVideos();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
  process.exit();
}

process.exitCode = testCode;
