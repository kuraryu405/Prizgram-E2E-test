import { spawn } from "node:child_process";
import { readdir, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

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

const MOBILE_DEMO_WAIT_CUT_MIN_SECONDS = 1.5;

async function readMobileDemoTimeline(webm) {
  const timelinePath = join(dirname(webm), "mobile-demo-timeline.json");
  try {
    return JSON.parse(await readFile(timelinePath, "utf8"));
  } catch (error) {
    if (basename(webm) === "video.webm") {
      throw new Error(
        `Mobile demo timeline is missing or invalid for the main recording: ${timelinePath}`,
      );
    }
    return undefined;
  }
}

function mobileDemoCutFilter(timeline) {
  if (!timeline || !Array.isArray(timeline.waits)) return undefined;

  const waits = timeline.waits
    .filter(
      (wait) =>
        Number.isFinite(wait.startSeconds) &&
        Number.isFinite(wait.endSeconds) &&
        wait.endSeconds - wait.startSeconds >= MOBILE_DEMO_WAIT_CUT_MIN_SECONDS,
    )
    .map((wait) => ({
      start: Math.max(0, wait.startSeconds),
      end: Math.max(0, wait.endSeconds),
    }))
    .filter((wait) => wait.end > wait.start)
    .sort((left, right) => left.start - right.start);

  const mergedWaits = [];
  for (const wait of waits) {
    const previous = mergedWaits.at(-1);
    if (previous && wait.start <= previous.end + 0.05) {
      previous.end = Math.max(previous.end, wait.end);
    } else {
      mergedWaits.push({ ...wait });
    }
  }
  if (mergedWaits.length === 0) return undefined;

  const segments = [];
  let cursor = 0;
  for (const wait of mergedWaits) {
    if (wait.start > cursor + 0.05) {
      segments.push(
        `[0:v]trim=start=${cursor.toFixed(3)}:end=${wait.start.toFixed(3)},setpts=PTS-STARTPTS[v${segments.length}]`,
      );
    }
    cursor = Math.max(cursor, wait.end);
  }

  const timelineDuration = Number(timeline.durationSeconds);
  if (!Number.isFinite(timelineDuration) || cursor < timelineDuration - 0.05) {
    segments.push(
      `[0:v]trim=start=${cursor.toFixed(3)},setpts=PTS-STARTPTS[v${segments.length}]`,
    );
  }

  if (segments.length === 0) return undefined;
  const labels = segments.map((_, index) => `[v${index}]`).join("");
  const filter = `${segments.join(";")};${labels}concat=n=${segments.length}:v=1:a=0[cutv];[cutv]scale=1080:2340:flags=lanczos[outv]`;
  const removedSeconds = mergedWaits.reduce(
    (total, wait) => total + wait.end - wait.start,
    0,
  );
  return { filter, removedSeconds, waitCount: mergedWaits.length };
}

async function convertVideos() {
  const webmFiles = (await walk(resultsDir)).filter((path) => path.endsWith(".webm"));
  if (webmFiles.length === 0) {
    process.stdout.write("No Playwright WebM recordings were produced; MP4 conversion skipped.\n");
    return;
  }

  await assertFfmpeg();
  let converted = 0;
  for (const webm of webmFiles) {
    const finalMp4 = webm.replace(/\.webm$/, ".mp4");
    const tempMp4 = `${finalMp4}.tmp.mp4`;
    const timeline =
      mobileDemo && basename(webm) === "video.webm"
        ? await readMobileDemoTimeline(webm)
        : undefined;
    const cut = mobileDemo ? mobileDemoCutFilter(timeline) : undefined;
    const mobileDemoVideoArgs = mobileDemo
      ? ["-crf", "18"]
      : ["-crf", "23"];
    const filterArgs = cut
      ? ["-filter_complex", cut.filter, "-map", "[outv]"]
      : mobileDemo
        ? ["-vf", "scale=1080:2340:flags=lanczos"]
        : [];
    const code = await run("ffmpeg", [
      "-y",
      "-i",
      webm,
      ...filterArgs,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      ...mobileDemoVideoArgs,
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
    converted += 1;
    if (cut) {
      process.stdout.write(
        `Mobile demo wait-cut: removed approximately ${cut.removedSeconds.toFixed(1)}s across ${cut.waitCount} LLM wait interval(s).\n`,
      );
    }
    process.stdout.write(`MP4 evidence: ${finalMp4}\n`);
  }
  process.stdout.write(`Converted ${converted} Playwright recording(s) to MP4. Raw WebM is retained for Playwright report compatibility.\n`);
}

const playwrightArgs = process.argv.slice(2);
const goldenJourney = playwrightArgs.some((arg) =>
  arg.includes("tests/acceptance/golden-journey.spec.ts"),
);
const mobileDemo = playwrightArgs.some((arg) =>
  arg.includes("tests/acceptance/mobile-demo.spec.ts"),
);
const childEnv = {
  ...process.env,
  ...(goldenJourney || mobileDemo ? { E2E_HUMAN_PACE: "true" } : {}),
};

if (goldenJourney) {
  process.stdout.write(
    "Golden Journey human-readable pacing enabled (slow actions + page showcase scrolling).\n",
  );
}

if (mobileDemo) {
  process.stdout.write(
    "Mobile demo human-readable pacing enabled (390x844 mobile source, upscaled to portrait 1080x2340 MP4).\n",
  );
}

const testCode = await run(
  "pnpm",
  ["exec", "playwright", "test", ...playwrightArgs],
  { env: childEnv },
);

try {
  await convertVideos();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
  process.exit();
}

process.exitCode = testCode;
