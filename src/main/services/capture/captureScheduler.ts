export interface CaptureSchedulerOptions {
  intervalMs: number;
  run: () => void | Promise<void>;
}

export function createCaptureScheduler(options: CaptureSchedulerOptions) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let paused = false;

  function tick() {
    if (!paused) {
      void options.run();
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, options.intervalMs);
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
    },
    getState() {
      return {
        running: Boolean(timer),
        paused
      };
    }
  };
}
