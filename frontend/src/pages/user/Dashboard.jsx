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
  ShieldCheck
} from "lucide-react";
import { complaintService } from "../../services/complaintService";
import StatCard from "../../components/StatCard";
import ComplaintCard from "../../components/ComplaintCard";
import AIPulseRadar from "../../components/AIPulseRadar";

export default function UserDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await complaintService.getMyComplaints();
        setComplaints(data);
      } catch (err) {
        console.error("Failed to load complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
