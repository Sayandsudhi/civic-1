import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, PlayCircle, ShieldCheck, Sparkles, UserCheck, Archive } from "lucide-react";
import { formatDateTime } from "../utils/priority";

const STAGES = [
  { key: "SUBMITTED", label: "Submitted", icon: Clock },
  { key: "AI_PRIORITIZED", label: "AI Prioritized", icon: Sparkles },
  { key: "ASSIGNED", label: "Assigned", icon: UserCheck },
  { key: "IN_PROGRESS", label: "In Progress", icon: PlayCircle },
  { key: "RESOLVED", label: "Resolved", icon: CheckCircle2 },
  { key: "CLOSED", label: "Closed", icon: Archive },
];

export default function ComplaintTimeline({ currentStatus = "NEW", updates = [] }) {
  // Determine current stage index
  let activeIndex = 1; // Default to AI Prioritized once created
  if (currentStatus === "NEW") activeIndex = 1;
  else if (currentStatus === "ASSIGNED") activeIndex = 2;
  else if (currentStatus === "IN_PROGRESS") activeIndex = 3;
  else if (currentStatus === "RESOLVED") activeIndex = 4;
  else if (currentStatus === "CLOSED") activeIndex = 5;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        Resolution Progress Timeline
      </h4>

      {/* Horizontal progress indicators */}
      <div className="relative flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {/* Background track */}
        <div className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 bg-slate-800 -z-0" />
        {/* Active track */}
        <div
          className="absolute top-1/2 left-4 h-1 -translate-y-1/2 bg-blue-600 transition-all duration-700 -z-0"
          style={{ width: `${(activeIndex / (STAGES.length - 1)) * 92}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = idx <= activeIndex;
          const isCurrent = idx === activeIndex;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="flex flex-col items-center shrink-0 relative z-10 px-2">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isDone ? "#2563eb" : "#1e293b",
                  borderColor: isCurrent ? "#60a5fa" : isDone ? "#2563eb" : "#334155"
                }}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors shadow-xs ${
                  isCurrent ? "ring-2 ring-blue-500/30" : ""
                }`}
              >
                <Icon className={`w-4 h-4 ${isDone ? "text-white" : "text-slate-500"}`} />
              </motion.div>
              <span className={`text-[11px] font-semibold mt-2 ${isDone ? "text-slate-200" : "text-slate-500"}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Audit History Log Entries */}
      <div className="space-y-3 mt-6 border-t border-slate-800/80 pt-4">
        <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Officer & System Audit Log
        </h5>
        {updates.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No status transitions recorded yet.</p>
        ) : (
          updates.map((u, i) => (
            <div key={u.id || i} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-start gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-200">{u.user_name || "Civic Officer"}</span>
                  <span>{formatDateTime(u.created_at)}</span>
                </div>
                <p className="text-slate-300 mt-1">{u.note || `Updated status to ${u.new_status}`}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
