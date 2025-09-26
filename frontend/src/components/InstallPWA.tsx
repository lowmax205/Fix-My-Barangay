"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Minimal Add to Home Screen prompt handler
type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    // Detect if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) setCanInstall(false);

    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!canInstall) return null;

  return (
    <Button variant="secondary" onClick={onInstallClick} aria-label="Install app">
      Install App
    </Button>
  );
}
