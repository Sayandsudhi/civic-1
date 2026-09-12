import React from "react";
import { Radio } from "lucide-react";

export default function AIPulseRadar({ recentCount = 4, departmentName = "All Departments" }) {
  return (
    <div className="relative rounded-2xl bg-slate-900/90 p-5 overflow-hidden border border-slate-800 shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        {/* Description */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            OPERATIONS DISPATCH & TRIAGE ACTIVE
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
            Incident Triage & Priority Monitor
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {departmentName}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time assessment evaluating incident severity, public safety hazards, and department routing queues.
          </p>

          <div className="flex items-center justify-center md:justify-start gap-6 mt-3 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Safety Override System Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

