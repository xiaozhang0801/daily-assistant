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

  const ranges = sessions
    .map((session): DurationRange | null => {
      const startedAt = Date.parse(session.startedAt);
      const endedAt = session.endedAt ? Date.parse(session.endedAt) : nowTime;
      if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;

      if (!session.endedAt && startedAt < range.start) return null;

      const clippedStart = Math.max(startedAt, range.start);
      const clippedEnd = Math.min(endedAt, range.end);
      return clippedEnd > clippedStart ? { start: clippedStart, end: clippedEnd } : null;
    })
    .filter((durationRange): durationRange is DurationRange => durationRange !== null)
    .sort((left, right) => left.start - right.start);

  const mergedRanges = ranges.reduce<DurationRange[]>((merged, current) => {
    const previous = merged[merged.length - 1];
    if (previous && current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }

    return merged;
  }, []);

  const totalMs = mergedRanges.reduce(
    (total, durationRange) => total + durationRange.end - durationRange.start,
    0
  );

  return Math.floor(totalMs / 60_000);
}
