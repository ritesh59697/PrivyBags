"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020408]"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for premium feel
          }}
          className="relative w-28 h-28 sm:w-32 sm:h-32 mb-8"
        >
          {/* Pulsing ring around logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.4, 0], scale: [1, 1.4, 1.6] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
            className="absolute inset-0 rounded-full border-2 border-purple-500/30"
          />
          
          <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/20">
            <Image
              src="/logo.png"
              alt="PrivyBag Logo"
              fill
              className="object-cover scale-110"
              priority
            />
          </div>
        </motion.div>

        {/* Text Animation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">
            PrivyBag
          </h1>
          <p className="text-purple-400/60 text-sm font-medium tracking-widest uppercase">
            Private tipping on Solana
          </p>
        </motion.div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-12 w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-full w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
        />
      </div>
    </motion.div>
  );
}
