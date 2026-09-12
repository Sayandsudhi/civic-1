import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart3, 
  FileText, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Users, 
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Radio
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { adminService } from "../../services/adminService";
import StatCard from "../../components/StatCard";
import AIPulseRadar from "../../components/AIPulseRadar";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-2xl glass-panel animate-pulse bg-slate-900/40" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-2xl glass-panel animate-pulse bg-slate-900/40" />
          ))}
        </div>
      </div>
    );
  }

  const { status_counts, priority_counts, departments_breakdown, priority_distribution, recent_trend } = analytics;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            MUNICIPAL INTELLIGENCE HUB
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Administrator Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-departmental issue monitoring, AI triage distributions, and resolution benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Sync Metrics
          </button>
          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all"
          >
            Master Complaints Ledger
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* AI Pulse Radar Widget */}
      <AIPulseRadar recentCount={status_counts.total} departmentName="City-Wide Operations" />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard title="Total Complaints" value={status_counts.total} icon={FileText} color="blue" />
        <StatCard title="Critical Incidents" value={priority_counts.critical} icon={AlertOctagon} color="red" />
        <StatCard title="High Urgency" value={priority_counts.high} icon={TrendingUp} color="orange" />
        <StatCard title="In Progress" value={status_counts.in_progress} icon={Clock} color="amber" />
        <StatCard title="Resolved Issues" value={status_counts.resolved} icon={CheckCircle2} color="emerald" />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Department Breakdown Bar Chart */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Complaints by Department</h3>
              <p className="text-xs text-slate-400">Total reported issues grouped across active departments</p>
            </div>
            <Link to="/admin/departments" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments_breakdown}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(val) => val.split(' ')[0]} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} 
                  itemStyle={{ color: "#38bdf8" }}
                />
                <Bar dataKey="total_complaints" fill="#2563eb" radius={[6, 6, 0, 0]} name="Total Issues" />
                <Bar dataKey="resolved_complaints" fill="#10b981" radius={[6, 6, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 5 Cols: Priority Doughnut Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Priority Distribution</h3>
            <p className="text-xs text-slate-400">Proportion of civic issues categorized by AI safety severity</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priority_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priority_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
            {priority_distribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Incident Velocity (Past 7 Days)</h3>
            <p className="text-xs text-slate-400">Daily trajectory of new reports, critical triggers, and resolutions</p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-500/30">
            Overall Resolution Rate: {analytics.resolution_rate}%
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recent_trend}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} 
              />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" name="Total Reports" />
              <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCrit)" name="Critical Emergencies" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
