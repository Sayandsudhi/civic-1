export const PRIORITY_CONFIG = {
  CRITICAL: {
    label: "CRITICAL",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-400",
    borderColor: "border-rose-500/30",
    glow: "",
    dotColor: "bg-rose-500",
    barColor: "bg-rose-500"
  },
  HIGH: {
    label: "HIGH",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
    glow: "",
    dotColor: "bg-orange-500",
    barColor: "bg-orange-500"
  },
  MEDIUM: {
    label: "MEDIUM",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    glow: "",
    dotColor: "bg-blue-500",
    barColor: "bg-blue-500"
  },
  LOW: {
    label: "LOW",
    bgColor: "bg-slate-500/15",
    textColor: "text-slate-300",
    borderColor: "border-slate-600/40",
    glow: "",
    dotColor: "bg-slate-400",
    barColor: "bg-slate-400"
  }
};

export const STATUS_CONFIG = {
  NEW: {
    label: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30"
  },
  ASSIGNED: {
    label: "Assigned",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30"
  },
  RESOLVED: {
    label: "Resolved",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30"
  },
  CLOSED: {
    label: "Closed",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30"
  }
};

export function getPriorityProps(level) {
  const normalized = (level || "MEDIUM").toUpperCase();
  return PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.MEDIUM;
}

export function getStatusProps(status) {
  const normalized = (status || "NEW").toUpperCase();
  return STATUS_CONFIG[normalized] || STATUS_CONFIG.NEW;
}

export function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return isoString;
  }
}
