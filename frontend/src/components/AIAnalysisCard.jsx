import React from "react";
import { Cpu, ShieldAlert, Zap, Activity, Users, Flame } from "lucide-react";
import PriorityBadge from "./PriorityBadge";

export default function AIAnalysisCard({ complaint }) {
  const factors = [
    { label: "Severity Factor", val: complaint.severity, icon: Flame, color: "bg-red-500", weight: "25%" },
    { label: "Urgency Factor", val: complaint.urgency, icon: Activity, color: "bg-orange-500", weight: "25%" },
    { label: "Public Impact", val: complaint.public_impact, icon: Users, color: "bg-blue-500", weight: "20%" },
    { label: "Safety / Hazard Risk", val: complaint.safety_risk, icon: ShieldAlert, color: "bg-amber-500", weight: "30%" },
  ];

  return (
    <div className={`p-6 rounded-2xl ${complaint.emergency ? 'bg-red-950/20 border border-red-500/50 shadow-xs' : 'bg-slate-900/90 border border-slate-800 shadow-xs'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">Priority Assessment Breakdown</h4>
            <p className="text-xs text-slate-400">Deterministic scoring & hazard evaluation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
            <span className="text-2xl font-black text-white">{complaint.priority_score}/100</span>
          </div>
          <PriorityBadge level={complaint.priority_level} emergency={complaint.emergency} size="lg" />
        </div>
      </div>

      {/* Emergency Alert Banner if Emergency */}
      {complaint.emergency && (
        <div className="mb-5 p-4 rounded-xl bg-red-600/15 border border-red-500/60 flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-400 fill-red-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-bold text-red-300">EMERGENCY SAFETY OVERRIDE ACTIVE</h5>
            <p className="text-xs text-red-200/90 mt-0.5 leading-relaxed">
              This report contains critical public hazard indicators that automatically trigger immediate highest priority dispatch.
            </p>
          </div>
        </div>
      )}

      {/* 4 Multi-Factor Score Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {factors.map((f) => (
          <div key={f.label} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5 text-slate-400" />
                {f.label}
              </span>
              <span className="font-bold text-white">{f.val}/100 <span className="text-[10px] text-slate-500">({f.weight})</span></span>
            </div>
            {/* Bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${f.color} transition-all duration-700`}
                style={{ width: `${f.val}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Reasoning quote */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
          Triage Assessment Summary:
        </h5>
        <p className="text-xs text-slate-300 italic leading-relaxed">
          "{complaint.ai_reason}"
        </p>
      </div>
    </div>
  );
}
