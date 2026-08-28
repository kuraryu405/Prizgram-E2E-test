import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type DemoWait = Readonly<{
  label: string;
  startSeconds: number;
  endSeconds: number;
}>;

type ActiveTimeline = {
  startedAt: number;
  startedAtIso: string;
  waits: DemoWait[];
};

export type DemoTimelineFile = Readonly<{
  version: 1;
  startedAt: string;
  durationSeconds: number;
  waits: ReadonlyArray<DemoWait>;
}>;

let activeTimeline: ActiveTimeline | undefined;

function elapsedSeconds(startedAt: number): number {
  return Math.max(0, (performance.now() - startedAt) / 1_000);
}

export function startDemoTimeline(): void {
  activeTimeline = {
    startedAt: performance.now(),
    startedAtIso: new Date().toISOString(),
    waits: [],
  };
}

export async function finishDemoTimeline(path: string): Promise<void> {
  if (activeTimeline === undefined) return;

  const timeline = activeTimeline;
  activeTimeline = undefined;
  const payload: DemoTimelineFile = {
    version: 1,
    startedAt: timeline.startedAtIso,
    durationSeconds: elapsedSeconds(timeline.startedAt),
    waits: timeline.waits,
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function withDemoWait<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const timeline = activeTimeline;
  if (timeline === undefined) return operation();

  const startSeconds = elapsedSeconds(timeline.startedAt);
  try {
    return await operation();
  } finally {
    timeline.waits.push({
      label,
      startSeconds,
      endSeconds: elapsedSeconds(timeline.startedAt),
    });
  }
}
