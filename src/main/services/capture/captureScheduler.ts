export interface CaptureSchedulerOptions {
  intervalMs: number | (() => number);
  run: () => void | Promise<void>;
}

export function createCaptureScheduler(options: CaptureSchedulerOptions) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentIntervalMs: number | null = null;
  let paused = false;

  function resolveIntervalMs(): number {
    const intervalMs = typeof options.intervalMs === "function" ? options.intervalMs() : options.intervalMs;
    return Math.max(1_000, intervalMs);
  }

  function tick() {
    if (!paused) {
      void options.run();
    }
  }

  return {
    start() {
      const nextIntervalMs = resolveIntervalMs();
      if (timer && currentIntervalMs === nextIntervalMs) return;
      if (timer) {
        clearInterval(timer);
      }
      currentIntervalMs = nextIntervalMs;
      timer = setInterval(tick, nextIntervalMs);
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      currentIntervalMs = null;
    },
    getState() {
      return {
        running: Boolean(timer),
        paused
      };
    }
  };
}
