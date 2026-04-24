"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/ui/SplashScreen";

export function SplashProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check session storage to only show on first load of the session
    const hasSeenSplash = sessionStorage.getItem("privybag-splash-seen");

    if (!hasSeenSplash) {
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem("privybag-splash-seen", "true");
        
        // Brief delay after fade out before marking as fully ready
        setTimeout(() => setIsReady(true), 600);
      }, 2000); // Show for 2 seconds

      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {isVisible && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      {/* 
        We keep children hidden or blurred until the splash is gone 
        to ensure the reveal feels smooth.
      */}
      <div className={`transition-opacity duration-700 ${isReady ? "opacity-100" : "opacity-0"}`}>
        {children}
      </div>
    </>
  );
}
