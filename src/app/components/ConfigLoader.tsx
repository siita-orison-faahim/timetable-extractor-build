"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfigLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // We want a smooth progression from 0 to 98% over approximately 8 seconds.
    // To make it feel natural/organic, let's use a slow down effect as it gets closer to 98%.
    const duration = 8000; // 8 seconds total
    const intervalTime = 100; // tick every 100ms
    const totalTicks = duration / intervalTime;
    let tick = 0;

    const interval = setInterval(() => {
      tick++;
      if (tick >= totalTicks) {
        // Hold at 98% until parent step changes
        setProgress(98);
        clearInterval(interval);
        return;
      }

      // Using a decelerating easing curve: progress = 98 * (1 - (1 - t)^3)
      const t = tick / totalTicks;
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      const nextProgress = Math.min(Math.round(easeOutCubic * 98), 98);
      setProgress(nextProgress);
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  const stageText = useMemo(() => {
    if (progress <= 20) return "Reading PDFs...";
    if (progress <= 50) return "Extracting registered courses...";
    if (progress <= 80) return "Analyzing university timetable...";
    if (progress <= 95) return "Cross-referencing schedules...";
    return "Finalizing your clean timetable...";
  }, [progress]);

  return (
    <div
      className="flex flex-col items-center justify-center space-y-8 w-full max-w-xs"
      role="status"
      aria-live="polite"
      aria-label={`Processing documents... Current progress is ${progress}%: ${stageText}`}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="text-6xl font-bebas text-black select-none tracking-wider">
          AUTOCLASS
        </div>
        <div className="text-[10px] text-v-text-secondary/50 uppercase tracking-[0.2em] font-bold font-bebas">
          LOADING • {progress}%
        </div>
      </div>

      <div className="w-full h-1 bg-[#eaeaea] rounded-full overflow-hidden relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-black rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      </div>

      <div className="h-8 flex items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stageText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="text-xs font-semibold text-v-text-secondary uppercase tracking-[0.1em]"
          >
            {stageText}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
