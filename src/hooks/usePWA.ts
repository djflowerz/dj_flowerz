import { useState, useEffect } from 'react';

export const usePWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installable, setInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setInstallable(true);
            console.log('--- [PWA] Install Prompt Captured ---');
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setInstallable(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`--- [PWA] User response to the install prompt: ${outcome} ---`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setInstallable(false);
    };

    return { installable, installApp };
};
