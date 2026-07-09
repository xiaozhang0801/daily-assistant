import { describe, expect, it } from "vitest";
import { calculateRecordingDurationMinutes } from "../../src/main/ipc/recordingDuration";

describe("recording duration", () => {
  it("does not carry stale open sessions from a previous day into today", () => {
    const minutes = calculateRecordingDurationMinutes(
      [
        {
          id: "stale-open-session",
          startedAt: "2026-07-08T08:00:00.000Z",
          endedAt: null
        }
      ],
      "2026-07-09",
      new Date("2026-07-09T02:30:00.000Z")
    );

    expect(minutes).toBe(0);
  });

  it("does not double-count overlapping open sessions on the same day", () => {
    const minutes = calculateRecordingDurationMinutes(
      [
        {
          id: "session-1",
          startedAt: "2026-07-09T02:00:00.000Z",
          endedAt: null
        },
        {
          id: "session-2",
          startedAt: "2026-07-09T02:15:00.000Z",
          endedAt: null
        }
      ],
      "2026-07-09",
      new Date("2026-07-09T02:30:00.000Z")
    );

    expect(minutes).toBe(30);
  });
});
