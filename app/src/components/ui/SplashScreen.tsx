"use client";
// src/components/ui/SplashScreen.tsx

import { motion } from "framer-motion";
import Image from "next/image";

// ─── Particle ─────────────────────────────────────────────────────────────────
// Small floating orb that drifts upward — adds depth without being distracting.
function Particle({
  x, y, size, delay, duration,
}: {
  x: string; y: string; size: number; delay: number; duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
      }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.7, 0],
        y: [-20, -80],
        scale: [0, 1, 0.5],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        repeatDelay: duration * 0.4,
        ease: "easeOut",
      }}
    />
  );
}

const PARTICLES = [
  { x: "20%",  y: "65%", size: 4,  delay: 0.0, duration: 3.2 },
  { x: "40%",  y: "70%", size: 3,  delay: 0.5, duration: 2.8 },
  { x: "55%",  y: "60%", size: 5,  delay: 0.2, duration: 3.6 },
  { x: "72%",  y: "68%", size: 3,  delay: 0.9, duration: 2.6 },
  { x: "83%",  y: "62%", size: 4,  delay: 0.4, duration: 3.0 },
  { x: "30%",  y: "72%", size: 2,  delay: 1.1, duration: 2.4 },
  { x: "65%",  y: "74%", size: 3,  delay: 0.7, duration: 3.4 },
  { x: "12%",  y: "58%", size: 2,  delay: 1.3, duration: 2.9 },
];

// ─── SplashScreen ──────────────────────────────────────────────────────────────
export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#020408" }}
    >
      {/* ── Deep atmosphere ──────────────────────────────────────────────────── */}
      {/* Outer ambient haze */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(109,40,217,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Rotating slow aurora ring */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.06) 25%, transparent 50%, rgba(59,130,246,0.04) 75%, transparent 100%)",
          filter: "blur(40px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Grid dot overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* ── Core content ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center gap-8">

        {/* Logo cluster */}
        <div className="relative flex items-center justify-center">

          {/* Outermost slow pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200, height: 200,
              border: "1px solid rgba(139,92,246,0.08)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Mid pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 160, height: 160,
              border: "1px solid rgba(139,92,246,0.14)",
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 3.5, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner glow disk */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 130, height: 130,
              background:
                "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
            animate={{ scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -20 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ perspective: "800px" }}
            className="relative w-28 h-28 sm:w-32 sm:h-32"
          >
            {/* Logo border glow */}
            <div
              className="absolute inset-0 rounded-[2rem]"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(139,92,246,0.35), 0 0 40px rgba(109,40,217,0.25), 0 0 80px rgba(109,40,217,0.1)",
              }}
            />

            <motion.div
              className="relative w-full h-full rounded-[2rem] overflow-hidden"
              style={{
                border: "1px solid rgba(139,92,246,0.2)",
              }}
              animate={{ boxShadow: [
                "0 8px 40px rgba(109,40,217,0.2)",
                "0 8px 60px rgba(109,40,217,0.35)",
                "0 8px 40px rgba(109,40,217,0.2)",
              ]}}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/plogo.png"
                alt="PrivyBag"
                fill
                className="object-cover scale-110"
                priority
                sizes="(max-width: 768px) 112px, 128px"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Brand text */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-2"
        >
          {/* Wordmark */}
          <div className="flex items-baseline gap-0.5">
            {"PrivyBag".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + i * 0.045,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(1.875rem, 6vw, 2.5rem)",
                  letterSpacing: "-0.03em",
                  color: "#f0f4ff",
                  display: "inline-block",
                  textShadow: "0 0 40px rgba(139,92,246,0.3)",
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Tagline with shimmer effect */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.85 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.95, duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden px-4 py-1 rounded-full"
            style={{
              background: "rgba(139,92,246,0.07)",
              border: "1px solid rgba(139,92,246,0.18)",
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)",
                translateX: "-100%",
              }}
              animate={{ translateX: "200%" }}
              transition={{ delay: 1.4, duration: 1.2, ease: "easeInOut" }}
            />
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.6875rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(167,139,250,0.75)",
              }}
            >
              Private tipping · Solana
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-14 flex flex-col items-center gap-3">
        {/* Track */}
        <div
          className="w-40 h-[2px] rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #8b5cf6, #a78bfa, #8b5cf6, transparent)",
              backgroundSize: "200% 100%",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 2.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        {/* Powered-by line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(71,85,105,0.8)",
            fontFamily: "var(--font-display)",
          }}
        >
          Powered by Light Protocol · Solana
        </motion.p>
      </div>
    </motion.div>
  );
}
