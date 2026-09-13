import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  AlertOctagon, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck,
  Megaphone,
  AlertTriangle,
  Building2,
  MapPin,
  X
} from "lucide-react";
import { complaintService } from "../../services/complaintService";
import { broadcastService } from "../../services/broadcastService";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import StatCard from "../../components/StatCard";
import ComplaintCard from "../../components/ComplaintCard";
import AIPulseRadar from "../../components/AIPulseRadar";

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp - now;
  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const remMins = diffMins % 60;

  if (days > 0) return `${days}d ${remHours}h left`;
  if (hours > 0) return `${hours}h ${remMins}m left`;
  return `${diffMins}m left`;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [complaintsData, advisoriesData] = await Promise.all([
          complaintService.getMyComplaints(),
          broadcastService.getCitizenNotifications().catch(() => [])
        ]);
        const now = new Date();
        const nonExpired = (advisoriesData || []).filter(
          (adv) => !adv.expires_at || new Date(adv.expires_at) > now
        );
        setComplaints(complaintsData || []);
        setAdvisories(nonExpired);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Real-time WebSocket listener for immediate advisory additions and deletions
  useEffect(() => {
    if (!user?.id) return;

    let protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.host;

    if (API_BASE_URL) {
      try {
        const parsed = new URL(API_BASE_URL);
        host = parsed.host;
        protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      } catch {}
    }

    const wsUrl = `${protocol}//${host}/ws/citizen/${user.id}`;
    let socket = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_BROADCAST" && data.broadcast) {
            setAdvisories((prev) => [data.broadcast, ...prev.filter((b) => b.id !== data.broadcast.id)]);
          } else if (data.type === "BROADCAST_DELETED" && data.broadcast_id) {
            setAdvisories((prev) => prev.filter((b) => b.id !== data.broadcast_id));
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [user?.id]);

  // Periodic interval to automatically drop expired advisories
  useEffect(() => {
    const timer = setInterval(() => {
      setAdvisories((prev) =>
        prev.filter((adv) => !adv.expires_at || new Date(adv.expires_at) > new Date())
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "NEW" || c.status === "ASSIGNED").length;
  const inProgress = complaints.filter((c) => c.status === "IN_PROGRESS").length;
  const resolved = complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const critical = complaints.filter((c) => c.priority_level === "CRITICAL" || c.emergency).length;

  return (
    <div className="space-y-6">
      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Citizen Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Track the operational status and AI prioritization scores of your reported civic issues.</p>
        </div>
        <Link
          to="/complaints/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Raise New Complaint
        </Link>
      </div>

      {/* AI Pulse Radar Widget */}
      <AIPulseRadar recentCount={total} departmentName="My Community Reports" />

      {/* Active Municipal Bulletins & Emergency Alerts Banner */}
      {advisories.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900/90 border border-blue-500/30 space-y-3 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Active Ward Advisories & Emergency Bulletins
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {advisories.length} Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advisories.slice(0, 2).map((adv) => {
              const isUrgent = adv.alert_type === "EMERGENCY" || adv.alert_type === "WARNING";
              return (
                <div
                  key={adv.id}
                  className={`p-3.5 rounded-xl border ${
                    isUrgent
                      ? "bg-rose-950/20 border-rose-500/30"
                      : "bg-slate-900/80 border-slate-800"
                  } space-y-1.5`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {adv.department_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {adv.expires_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          {formatRemainingTime(adv.expires_at)}
                        </span>
                      )}
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {adv.target_ward || "All Wards"}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{adv.title}</h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{adv.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard title="Total Lodged" value={total} icon={FileText} color="blue" />
        <StatCard title="Pending Review" value={pending} icon={Clock} color="amber" />
        <StatCard title="In Progress" value={inProgress} icon={PlayCircle} color="cyan" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle2} color="emerald" />
        <StatCard title="Critical Incidents" value={critical} icon={AlertOctagon} color="red" />
      </div>

      {/* Recent Complaints Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Recent Complaints</span>
            <span className="text-xs font-normal text-slate-500">({complaints.length})</span>
          </h3>
          {complaints.length > 0 && (
            <Link to="/user/complaints" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl glass-panel animate-pulse bg-slate-900/40" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">No complaints reported yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Your community depends on active citizens. Report broken street lights, potholes, or safety hazards right away.
            </p>
            <Link
              to="/complaints/new"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold border border-blue-500/30 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              File Your First Report
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complaints.slice(0, 4).map((c) => (
              <ComplaintCard key={c.id} complaint={c} linkPrefix="/user/complaints" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
