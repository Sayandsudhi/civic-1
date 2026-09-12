import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ShieldAlert, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  AlertOctagon, 
  Radio, 
  ArrowRight,
  Filter,
  RefreshCw,
  FileText,
  Search,
  RotateCcw,
  Printer,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  X,
  SlidersHorizontal
} from "lucide-react";
import { officerService } from "../../services/officerService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import StatCard from "../../components/StatCard";
import AIPulseRadar from "../../components/AIPulseRadar";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/priority";
import { API_BASE_URL } from "../../services/api";

// Helper: Compute humanized duration between created_at and resolved_at
function calculateResolutionDuration(createdAt, resolvedAt) {
  if (!resolvedAt || !createdAt) return "Completed";
  const start = new Date(createdAt);
  const end = new Date(resolvedAt);
  const diffMs = Math.max(0, end - start);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const remMins = diffMins % 60;

  if (days > 0) return `${days}d ${remHours}h`;
  if (hours > 0) return `${hours}h ${remMins}m`;
  return `${diffMins} min${diffMins === 1 ? "" : "s"}`;
}

export default function DepartmentDashboard({ initialTab = "ACTIVE" }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // View tabs: "ACTIVE" vs "RESOLVED"
  const [activeViewTab, setActiveViewTab] = useState(
    location.pathname.includes("/resolved") ? "RESOLVED" : initialTab
  );

  // Filters within Active tab
  const [activeStatusFilter, setActiveStatusFilter] = useState("ALL");

  // Filters & search within Resolved tab
  const [resolvedSearch, setResolvedSearch] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("ALL"); // ALL, RESOLVED, CLOSED
  const [resolvedSort, setResolvedSort] = useState("NEWEST"); // NEWEST, OLDEST, SCORE

  // Modals state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Reopen modal state
  const [reopenComplaint, setReopenComplaint] = useState(null);
  const [reopenNote, setReopenNote] = useState("");
  const [reopening, setReopening] = useState(false);

  // Print resolution certificate modal
  const [printComplaint, setPrintComplaint] = useState(null);

  useEffect(() => {
    if (location.pathname.includes("/resolved")) {
      setActiveViewTab("RESOLVED");
    }
  }, [location.pathname]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      // Fetch all department complaints so we can seamlessly separate active vs resolved
      const data = await officerService.getDepartmentComplaints("ALL");
      setComplaints(data);
    } catch (err) {
      showToast("Error loading department operations queue.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  // Setup WebSocket connection for live complaints in this department
  useEffect(() => {
    if (!user?.department_id) return;

    let protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.host;

    if (API_BASE_URL) {
      try {
        const parsed = new URL(API_BASE_URL);
        host = parsed.host;
        protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      } catch {}
    }

    const wsUrl = `${protocol}//${host}/ws/officer/${user.department_id}`;
    let socket = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_COMPLAINT") {
            showToast(
              `⚡ NEW COMPLAINT RECEIVED: ${data.complaint.title.substring(0, 40)}...`,
              data.complaint.emergency ? "emergency" : "warning",
              6000
            );
            loadComplaints();
          } else if (data.type === "STATUS_UPDATE") {
            loadComplaints();
          }
        } catch {}
      };
    } catch (e) {
      console.log("WebSocket init skipped:", e);
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user]);

  // Handle Quick Status Commit
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setUpdating(true);
    try {
      await officerService.updateComplaintStatus(selectedComplaint.id, newStatus, statusNote.trim());
      
      const isNowResolved = newStatus === "RESOLVED" || newStatus === "CLOSED";
      if (isNowResolved) {
        showToast(
          `Complaint ${selectedComplaint.complaint_number} updated to ${newStatus} and archived in Resolved Cases.`,
          "success"
        );
      } else {
        showToast(`Complaint ${selectedComplaint.complaint_number} updated to ${newStatus}.`, "success");
      }

      setSelectedComplaint(null);
      setStatusNote("");
      await loadComplaints();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Reopening a Resolved Complaint
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenComplaint) return;
    if (!reopenNote.trim()) {
      showToast("Please provide a reason note for reopening this incident.", "warning");
      return;
    }

    setReopening(true);
    try {
      const noteWithTag = `[REOPENED BY OFFICER]: ${reopenNote.trim()}`;
      await officerService.updateComplaintStatus(reopenComplaint.id, "IN_PROGRESS", noteWithTag);
      showToast(
        `Incident ${reopenComplaint.complaint_number} reopened and returned to Active Operations Queue.`,
        "success"
      );
      setReopenComplaint(null);
      setReopenNote("");
      await loadComplaints();
      setActiveViewTab("ACTIVE"); // Switch back to active queue so officer sees it immediately
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to reopen incident.", "error");
    } finally {
      setReopening(false);
    }
  };

  // Split complaints into Active and Resolved
  const activeComplaints = useMemo(() => {
    return complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED");
  }, [complaints]);

  const resolvedComplaints = useMemo(() => {
    return complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED");
  }, [complaints]);

  // Filtered Active List
  const displayActive = useMemo(() => {
    if (activeStatusFilter === "ALL") return activeComplaints;
    return activeComplaints.filter((c) => c.status === activeStatusFilter);
  }, [activeComplaints, activeStatusFilter]);

  // Filtered & Searched Resolved List
  const displayResolved = useMemo(() => {
    let list = [...resolvedComplaints];

    if (resolvedFilter !== "ALL") {
      list = list.filter((c) => c.status === resolvedFilter);
    }

    if (resolvedSearch.trim()) {
      const q = resolvedSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.complaint_number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.location && c.location.toLowerCase().includes(q)) ||
          (c.resolution_note && c.resolution_note.toLowerCase().includes(q))
      );
    }

    if (resolvedSort === "NEWEST") {
      list.sort((a, b) => new Date(b.resolved_at || b.updated_at) - new Date(a.resolved_at || a.updated_at));
    } else if (resolvedSort === "OLDEST") {
      list.sort((a, b) => new Date(a.resolved_at || a.updated_at) - new Date(b.resolved_at || b.updated_at));
    } else if (resolvedSort === "SCORE") {
      list.sort((a, b) => b.priority_score - a.priority_score);
    }

    return list;
  }, [resolvedComplaints, resolvedFilter, resolvedSearch, resolvedSort]);

  // Overall KPI Metrics
  const activeTotal = activeComplaints.length;
  const critical = activeComplaints.filter((c) => c.priority_level === "CRITICAL" || c.emergency).length;
  const high = activeComplaints.filter((c) => c.priority_level === "HIGH").length;
  const inProgress = activeComplaints.filter((c) => c.status === "IN_PROGRESS").length;
  const resolvedTotal = resolvedComplaints.length;

  // Average Resolution Time Calculation
  const avgResolutionTimeStr = useMemo(() => {
    const withDuration = resolvedComplaints.filter((c) => c.resolved_at && c.created_at);
    if (withDuration.length === 0) return "N/A";
    const totalMins = withDuration.reduce((acc, c) => {
      const diff = Math.max(0, new Date(c.resolved_at) - new Date(c.created_at));
      return acc + Math.floor(diff / (1000 * 60));
    }, 0);
    const avgMins = Math.round(totalMins / withDuration.length);
    const h = Math.floor(avgMins / 60);
    const m = avgMins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${avgMins}m`;
  }, [resolvedComplaints]);

  const neutralizedEmergencies = useMemo(() => {
    return resolvedComplaints.filter((c) => c.emergency).length;
  }, [resolvedComplaints]);

  return (
    <div className="space-y-6">
      {/* Department Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5" />
            OPERATIONS CENTER DISPATCH
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {user?.department_name || "Department"} Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complaints are strictly ranked by AI triage and deterministic emergency hazard score. Immediate attention required for active queue items.
          </p>
        </div>

        <button
          onClick={loadComplaints}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {/* AI Pulse Radar Widget */}
      <AIPulseRadar recentCount={activeTotal} departmentName={user?.department_name} />

      {/* KPI Stats Grid (Interactive: clicking filters / switches views) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div 
          onClick={() => { setActiveViewTab("ACTIVE"); setActiveStatusFilter("ALL"); }}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard title="Active Queue" value={activeTotal} icon={FileText} color="blue" />
        </div>
        <div 
          onClick={() => { setActiveViewTab("ACTIVE"); setActiveStatusFilter("ALL"); }}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard title="Critical / Emergency" value={critical} icon={AlertOctagon} color="red" />
        </div>
        <div 
          onClick={() => { setActiveViewTab("ACTIVE"); setActiveStatusFilter("ALL"); }}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard title="High Urgency" value={high} icon={ShieldAlert} color="orange" />
        </div>
        <div 
          onClick={() => { setActiveViewTab("ACTIVE"); setActiveStatusFilter("IN_PROGRESS"); }}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard title="In Progress" value={inProgress} icon={PlayCircle} color="cyan" />
        </div>
        <div 
          onClick={() => { setActiveViewTab("RESOLVED"); }}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatCard title="Resolved Cases" value={resolvedTotal} icon={CheckCircle2} color="emerald" />
        </div>
      </div>

      {/* MASTER VIEW SELECTOR: Active Operations Queue vs Resolved Archive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveViewTab("ACTIVE")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeViewTab === "ACTIVE"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Active Operations Queue</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === "ACTIVE" ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {activeTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab("RESOLVED")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeViewTab === "RESOLVED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Resolved & Closed Archive</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === "RESOLVED" ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {resolvedTotal}
            </span>
          </button>
        </div>

        {activeViewTab === "ACTIVE" && (
          <span className="text-xs text-slate-500 font-medium">
            Urgent issues remain until officially transitioned to Resolved.
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PANEL 1: ACTIVE OPERATIONS QUEUE */}
      {/* ========================================================================= */}
      {activeViewTab === "ACTIVE" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">Active Priority Queue</h2>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                Sorted by Emergency & AI Hazard Score DESC
              </span>
            </div>

            {/* Active Status filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "NEW", "ASSIGNED", "IN_PROGRESS"].map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    activeStatusFilter === st
                      ? "bg-blue-600 text-white shadow-xs border border-blue-500/40"
                      : "bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {st === "ALL" ? "All Active" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Active Complaints Ranked List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl glass-panel animate-pulse bg-slate-900/40" />
              ))}
            </div>
          ) : displayActive.length === 0 ? (
            <div className="p-12 text-center rounded-3xl glass-panel border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No active pending complaints</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All assigned civic complaints in this queue are currently resolved or under control.
              </p>
              <button
                onClick={() => setActiveViewTab("RESOLVED")}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2"
              >
                View Resolved Cases Archive
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayActive.map((c) => {
                const isEmergency = c.emergency;
                const isCritical = c.priority_level === "CRITICAL";

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-2xl transition-all relative overflow-hidden ${
                      isEmergency
                        ? "bg-red-950/30 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
                        : isCritical
                        ? "glass-panel border-l-4 border-l-red-500 border-slate-800 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        : "glass-panel border-l-4 border-l-cyan-500/50 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Rank, Priority Score & Main info */}
                      <div className="flex items-start gap-4">
                        {/* Priority Score badge */}
                        <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 w-16 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                          <span className={`text-2xl font-bold ${isCritical ? 'text-red-400' : 'text-blue-400'}`}>
                            {c.priority_score}
                          </span>
                          <span className="text-[8px] text-slate-500">/ 100</span>
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {c.complaint_number}
                            </span>
                            <PriorityBadge level={c.priority_level} emergency={c.emergency} size="sm" />
                            <StatusBadge status={c.status} size="sm" />
                            <span className="text-[11px] text-slate-500">{formatDateTime(c.created_at)}</span>
                          </div>

                          <h3 className="text-base font-bold text-white leading-snug">
                            {c.title}
                          </h3>

                          {c.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{c.location}</span>
                            </div>
                          )}

                          {/* AI Reason Preview */}
                          {c.ai_reason && (
                            <p className="text-xs text-slate-300 italic line-clamp-1 mt-1">
                              <span className="text-cyan-400 font-semibold not-italic">AI Reason:</span> {c.ai_reason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          onClick={() => {
                            setSelectedComplaint(c);
                            setNewStatus(c.status === "NEW" ? "IN_PROGRESS" : c.status);
                            setStatusNote("");
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                        >
                          Quick Status
                        </button>

                        <Link
                          to={`/department/complaints/${c.id}`}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          Investigate
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL 2: RESOLVED & CLOSED CASES ARCHIVE */}
      {/* ========================================================================= */}
      {activeViewTab === "RESOLVED" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Resolution Registry Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-emerald-400" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  CIVIC RESOLUTION REGISTRY
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Resolved & Closed Incident Archive
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Official municipal audit log of resolved hazards, completed field restorations, and verified public safety interventions.
                </p>
              </div>

              {/* Quick Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Resolved</span>
                  <span className="text-xl font-black text-emerald-400">{resolvedTotal}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Resolution</span>
                  <span className="text-xl font-black text-cyan-400">{avgResolutionTimeStr}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hazards Cleared</span>
                  <span className="text-xl font-black text-amber-400">{neutralizedEmergencies}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resolvedSearch}
                onChange={(e) => setResolvedSearch(e.target.value)}
                placeholder="Search by complaint #, issue keywords, location, or resolution action..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {resolvedSearch && (
                <button
                  onClick={() => setResolvedSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Status pill filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {["ALL", "RESOLVED", "CLOSED"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setResolvedFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      resolvedFilter === f
                        ? "bg-emerald-500 text-black font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f === "ALL" ? "All" : f}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={resolvedSort}
                  onChange={(e) => setResolvedSort(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="NEWEST">Most Recently Resolved</option>
                  <option value="OLDEST">Oldest Resolved</option>
                  <option value="SCORE">Highest Initial Hazard Score</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resolved List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl glass-panel animate-pulse bg-slate-900/40" />
              ))}
            </div>
          ) : displayResolved.length === 0 ? (
            <div className="p-12 text-center rounded-3xl glass-panel border border-slate-800">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No resolved complaints match your search</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {resolvedSearch ? "Try adjusting your search keywords." : "When you resolve or close complaints from the active queue, they will be archived here."}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayResolved.map((c) => {
                const duration = calculateResolutionDuration(c.created_at, c.resolved_at || c.updated_at);

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3.5 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Resolution verification badge & Info */}
                      <div className="flex items-start gap-4">
                        {/* Verified Check Badge */}
                        <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 shrink-0 w-16 text-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-0.5" />
                          <span className="text-[8px] uppercase font-bold text-emerald-300">Resolved</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">{duration}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {c.complaint_number}
                            </span>
                            <StatusBadge status={c.status} size="sm" />
                            
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              Turnaround: {duration}
                            </span>

                            <span className="text-[11px] text-slate-500">
                              Resolved: {formatDateTime(c.resolved_at || c.updated_at)}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white leading-snug">
                            {c.title}
                          </h3>

                          {c.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{c.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        {/* Print / Save Resolution Slip */}
                        <button
                          onClick={() => setPrintComplaint(c)}
                          title="Print official resolution slip"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>Slip</span>
                        </button>

                        {/* Reopen Incident */}
                        <button
                          onClick={() => {
                            setReopenComplaint(c);
                            setReopenNote("");
                          }}
                          title="Reopen incident if recurring"
                          className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reopen</span>
                        </button>

                        {/* View Full History */}
                        <Link
                          to={`/department/complaints/${c.id}`}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          History
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Official Resolution Action Audit Quote */}
                    {c.resolution_note && (
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                            Official Resolution / Action Taken
                          </span>
                          <p className="text-slate-200 italic font-normal">
                            "{c.resolution_note}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK STATUS UPDATE MODAL */}
      {/* ========================================================================= */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">
              Update Status: {selectedComplaint.complaint_number}
            </h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-1">{selectedComplaint.title}</p>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select New Operational Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="NEW">NEW (Pending)</option>
                  <option value="ASSIGNED">ASSIGNED (In Queue)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Crew Dispatched)</option>
                  <option value="RESOLVED">RESOLVED (Move to Resolved Archive)</option>
                  <option value="CLOSED">CLOSED (Finalized)</option>
                </select>
              </div>

              {(newStatus === "RESOLVED" || newStatus === "CLOSED") && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
                  <span className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Archive Transition
                  </span>
                  This complaint will automatically move out of the active queue and into the{" "}
                  <strong className="text-emerald-300">Resolved Cases Archive</strong>.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  {newStatus === "RESOLVED" || newStatus === "CLOSED" ? "Resolution / Action Taken Note *" : "Officer Audit Note (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  required={newStatus === "RESOLVED" || newStatus === "CLOSED"}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={
                    newStatus === "RESOLVED" || newStatus === "CLOSED"
                      ? "Describe field action taken, e.g. 'Repaired snapped line, insulated cable and restored power grid safely.'"
                      : "e.g. Field crew dispatched with repair truck, cordon established..."
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs disabled:opacity-50 transition-all"
                >
                  {updating ? "Saving..." : "Commit Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REOPEN INCIDENT MODAL */}
      {/* ========================================================================= */}
      {reopenComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-lg font-black text-white">Reopen Incident</h3>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              Reopening <strong className="text-white">{reopenComplaint.complaint_number}</strong>:
            </p>
            <p className="text-xs text-slate-300 mb-4 italic line-clamp-1">
              "{reopenComplaint.title}"
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 text-xs text-amber-200">
                This will transition the incident back to <strong>IN_PROGRESS</strong> and place it directly into the <strong>Active Priority Queue</strong> for immediate follow-up.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason for Reopening *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenNote}
                  onChange={(e) => setReopenNote(e.target.value)}
                  placeholder="e.g. Citizen reported recurrence of power trip; secondary inspection required..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenComplaint(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopening}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {reopening ? "Reopening..." : "Reopen Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE RESOLUTION CERTIFICATE SLIP MODAL */}
      {/* ========================================================================= */}
      {printComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Civic Resolution Work Slip</h3>
              </div>
              <button
                onClick={() => setPrintComplaint(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slip Paper Container */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
              <div className="text-center border-b border-slate-800/80 pb-3">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                  CIVICPULSE AI MUNICIPAL RESOLUTION SLIP
                </div>
                <div className="text-sm font-black text-white mt-1">
                  REF: {printComplaint.complaint_number}
                </div>
                <div className="text-[11px] text-slate-400">
                  {user?.department_name || printComplaint.department_name}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident Title:</span>
                  <span className="text-white font-bold text-right max-w-[250px] truncate">{printComplaint.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-300">{printComplaint.location || "City Limits"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported On:</span>
                  <span className="text-slate-300">{formatDateTime(printComplaint.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolved On:</span>
                  <span className="text-emerald-400 font-bold">{formatDateTime(printComplaint.resolved_at || printComplaint.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Turnaround:</span>
                  <span className="text-cyan-400 font-bold">{calculateResolutionDuration(printComplaint.created_at, printComplaint.resolved_at || printComplaint.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Initial Hazard Score:</span>
                  <span className="text-amber-400">{printComplaint.priority_score}/100</span>
                </div>
              </div>

              {printComplaint.resolution_note && (
                <div className="border-t border-slate-800/80 pt-3">
                  <span className="text-slate-500 block mb-1">Official Resolution Record:</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-200 text-[11px]">
                    "{printComplaint.resolution_note}"
                  </div>
                </div>
              )}

              <div className="border-t border-dashed border-slate-800 pt-3 text-center text-[10px] text-slate-500">
                VERIFIED BY SMART DISPATCH SYSTEM • CIVICPULSE AI
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrintComplaint(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Resolution Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
