
import { toast } from 'sonner';

/**
 * Advanced Watchdog to protect the Music Pool from inspection.
 * Uses a debugger timing check to detect if DevTools is open.
 */
export class SecurityWatchdog {
  private static instance: SecurityWatchdog;
  private isDetected: boolean = false;
  private intervalId: any = null;
  private onViolation: () => void = () => {};

  private constructor() {}

  public static getInstance(): SecurityWatchdog {
    if (!SecurityWatchdog.instance) {
      SecurityWatchdog.instance = new SecurityWatchdog();
    }
    return SecurityWatchdog.instance;
  }

  public start(onViolation: () => void) {
    this.onViolation = onViolation;
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.check();
    }, 1000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private check() {
    const startTime = performance.now();
    
    // The debugger statement will pause execution ONLY if DevTools is open.
    // If it pauses, the time difference will be large.
    // NOTE: This can be annoying during development, so we should skip it in localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
       return;
    }

    // This is the "Best" stealth deterrent.
    (function() {
      const dbg = new Function('debugger');
      dbg();
    }());

    const endTime = performance.now();

    if (endTime - startTime > 100) {
      if (!this.isDetected) {
        this.isDetected = true;
        console.clear();
        toast.error("Security violation detected. Access revoked.", {
            description: "Unauthorized debugging tools are prohibited in the Private Sector."
        });
        this.onViolation();
      }
    }
  }
}
