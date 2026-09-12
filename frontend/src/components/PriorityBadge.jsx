import React from "react";
import { AlertOctagon, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { getPriorityProps } from "../utils/priority";

export default function PriorityBadge({ level, emergency = false, size = "md" }) {
  const props = getPriorityProps(level);

  const sizeClasses = size === "sm" 
    ? "text-xs px-2.5 py-0.5 gap-1.5" 
    : size === "lg" 
    ? "text-sm px-3.5 py-1.5 gap-2 font-bold" 
    : "text-xs px-3 py-1 gap-1.5 font-semibold";

  return (
    <div className="flex items-center gap-1.5">
      {emergency && (
        <span className={`inline-flex items-center rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300 font-semibold tracking-wider ${sizeClasses}`}>
          <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          EMERGENCY
        </span>
      )}
      <span className={`inline-flex items-center rounded-md border ${props.bgColor} ${props.borderColor} ${props.textColor} ${sizeClasses}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${props.dotColor}`} />
        {props.label}
      </span>
    </div>
  );
}
