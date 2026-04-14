
/**
 * Aura Titan: Security Watchdog (Singleton)
 * Detects DevTools and Inspect usage to protect sensitive platform code.
 */
class SecurityWatchdogClass {
    private static instance: SecurityWatchdogClass;
    private interval: any = null;
    private threshold = 160;

    private constructor() {}

    public static getInstance(): SecurityWatchdogClass {
        if (!SecurityWatchdogClass.instance) {
            SecurityWatchdogClass.instance = new SecurityWatchdogClass();
        }
        return SecurityWatchdogClass.instance;
    }

    public start(onViolation?: () => void) {
        if (typeof window === 'undefined') return;
        if (this.interval) return;

        console.log('[Stealth] Watchdog active');

        const check = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > this.threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > this.threshold;

            if (widthThreshold || heightThreshold) {
                console.warn('%cSECURITY BREACH DETECTED', 'color: red; font-size: 30px; font-weight: bold;');
                if (onViolation) onViolation();
            }
        };

        this.interval = setInterval(check, 2000);

        // Block keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' || 
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                ((e.ctrlKey || e.metaKey) && e.key === 'u')
            ) {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Disable context menu on sensitive zones
        const handleContextMenu = (e: MouseEvent) => {
            const path = window.location.pathname;
            if (path.includes('music-pool') || path.includes('admin')) {
                e.preventDefault();
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export const SecurityWatchdog = SecurityWatchdogClass;
