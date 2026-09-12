import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, color = "blue", trend }) {
  const colorMap = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    cyan: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    red: "text-rose-400 border-rose-500/25 bg-rose-500/10",
    orange: "text-orange-400 border-orange-500/25 bg-orange-500/10",
    amber: "text-amber-400 border-amber-500/25 bg-amber-500/10",
    emerald: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
    violet: "text-indigo-400 border-indigo-500/25 bg-indigo-500/10",
  };

  const activeStyle = colorMap[color] || colorMap.blue;

  return (
    <div
      className="p-5 rounded-xl bg-slate-900/75 border border-slate-800 relative overflow-hidden transition-all duration-150 hover:border-slate-700 shadow-xs"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{value}</div>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${activeStyle} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center text-xs text-slate-400">
          <span className="text-emerald-400 font-semibold mr-1.5">{trend}</span>
          <span>vs last period</span>
        </div>
      )}
    </div>
  );
}
