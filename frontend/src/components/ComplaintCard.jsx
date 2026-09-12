import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight, ShieldAlert, Cpu } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import { formatDateTime } from "../utils/priority";

export default function ComplaintCard({ complaint, linkPrefix = "/user/complaints" }) {
  const isEmergency = complaint.emergency;
  const isCritical = complaint.priority_level === "CRITICAL";

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`rounded-2xl p-5 relative overflow-hidden transition-all duration-200 ${
        isEmergency
          ? "bg-red-950/20 border border-red-500/50 shadow-xs"
          : isCritical
          ? "bg-slate-900/90 border border-red-500/30 shadow-xs"
          : "bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xs"
      }`}
    >
      {/* Top row: ID, Department & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            {complaint.complaint_number}
          </span>
          <span className="text-xs text-slate-300 font-medium bg-slate-800/80 px-2 py-0.5 rounded">
            {complaint.department_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge level={complaint.priority_level} emergency={complaint.emergency} size="sm" />
          <StatusBadge status={complaint.status} size="sm" />
        </div>
      </div>

      {/* Title & Description */}
      <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-blue-300 transition-colors">
        {complaint.title}
      </h4>
      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
        {complaint.description}
      </p>

      {/* AI Reason pill */}
      {complaint.ai_reason && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2">
          <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 line-clamp-1 italic">
            <span className="text-blue-400 font-medium not-italic">AI Triage Note:</span> {complaint.ai_reason}
          </p>
        </div>
      )}

      {/* Footer info: Location, Date, Link */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          {complaint.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[140px]">{complaint.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatDateTime(complaint.created_at)}</span>
          </span>
        </div>

        <Link
          to={`${linkPrefix}/${complaint.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors ml-auto"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
