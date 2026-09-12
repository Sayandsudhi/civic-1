import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, CheckCircle2, AlertOctagon, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import PriorityBadge from "./PriorityBadge";

const STEPS = [
  "Reading citizen report & parsing context...",
  "Running deterministic emergency safety check...",
  "Evaluating bodily hazard & electrocution risks...",
  "Estimating commuter & community public impact...",
  "Computing weighted multi-factor priority score...",
  "Routing to responsible municipal operations squad..."
];

export default function AIAnalysisModal({ isOpen, result, onClose, onViewComplaint }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsCompleted(false);
      setDisplayScore(0);
      return;
    }

    // Step progression animation
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setIsCompleted(true);
          return prev;
        }
      });
    }, 550);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Score counter animation once analysis completes
  useEffect(() => {
    if (isCompleted && result) {
      const target = result.priority_score || 85;
      let current = 0;
      const stepTime = 15;
      const stepAmount = Math.max(1, Math.floor(target / 40));

      const timer = setInterval(() => {
        current += stepAmount;
        if (current >= target) {
          setDisplayScore(target);
          clearInterval(timer);
          // Trigger confetti if high or critical
          if (target >= 75) {
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 }
              });
            } catch {}
          }
        } else {
          setDisplayScore(current);
        }
      }, stepTime);

      return () => clearInterval(timer);
    }
  }, [isCompleted, result]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 md:p-8 relative overflow-hidden"
      >
        {!isCompleted ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-16 h-16 rounded-xl border-2 border-blue-500/30 border-t-blue-500 flex items-center justify-center"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="w-7 h-7 text-blue-400" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              Analyzing Incident Report
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Automated triage system is evaluating incident severity and routing to the appropriate department.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Triaging category and priority score...
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-2"
          >
            {result?.emergency ? (
              <div className="w-14 h-14 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-red-400 fill-red-400" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-blue-400" />
              </div>
            )}

            <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">
              Priority Assignment Confirmed
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {result?.emergency ? "Critical Emergency Flagged" : "Report Triaged Successfully"}
            </h3>

            {/* Score badge */}
            <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 w-full flex items-center justify-around">
              <div>
                <div className="text-xs text-slate-400 uppercase font-medium">Priority Score</div>
                <div className="text-3xl font-black text-white tracking-tight mt-0.5">
                  {displayScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-slate-800" />

              <div>
                <div className="text-xs text-slate-400 uppercase font-medium mb-1">Assigned Severity</div>
                <PriorityBadge level={result?.priority_level || "HIGH"} emergency={result?.emergency} size="lg" />
              </div>
            </div>

            {/* AI Reasoning quote */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left text-xs text-slate-300 w-full leading-relaxed">
              <span className="font-semibold text-blue-400 block mb-1">Automated Triage Assessment:</span>
              "{result?.ai_reason}"
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={onViewComplaint}
                className="w-full py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold border border-blue-500/30 shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                Track This Complaint
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
