import type { RecordingSession } from "../../shared/types";

interface DurationRange {
  start: number;
  end: number;
}

function dayRange(date: string): DurationRange {
  return {
    start: Date.parse(`${date}T00:00:00.000Z`),
    end: Date.parse(`${date}T23:59:59.999Z`)
  };
}

export function calculateRecordingDurationMinutes(
  sessions: RecordingSession[],
  date: string,
  now: Date = new Date()
): number {
  const range = dayRange(date);
  const nowTime = now.getTime();
  const totalMs = sessions.reduce((total, session) => {
    const startedAt = Date.parse(session.startedAt);
    const endedAt = session.endedAt ? Date.parse(session.endedAt) : nowTime;
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return total;

    const clippedStart = Math.max(startedAt, range.start);
    const clippedEnd = Math.min(endedAt, range.end);
    return total + Math.max(0, clippedEnd - clippedStart);
  }, 0);

  return Math.floor(totalMs / 60_000);
}
