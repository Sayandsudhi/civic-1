import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, RefreshCw, ArrowRight, Building2, Calendar, MapPin } from "lucide-react";
import { adminService } from "../../services/adminService";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/priority";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (deptFilter) filters.department_id = deptFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (statusFilter) filters.status = statusFilter;
      if (search.trim()) filters.search = search.trim();

      const [cList, dList] = await Promise.all([
        adminService.getAllComplaints(filters),
        adminService.getDepartments()
      ]);
      setComplaints(cList);
      setDepartments(dList);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deptFilter, priorityFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Master Complaints Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">Cross-departmental public safety complaints, priority rankings, and resolution audits.</p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference ID, hazard keywords, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all whitespace-nowrap"
          >
            Apply Search
          </button>
        </form>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Priority Levels</option>
              <option value="CRITICAL">Critical (90-100)</option>
              <option value="HIGH">High (75-89)</option>
              <option value="MEDIUM">Medium (50-74)</option>
              <option value="LOW">Low (0-49)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Ledger List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
          No complaints found matching current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                      {c.complaint_number}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {c.department_name}
                    </span>
                    <PriorityBadge level={c.priority_level} emergency={c.emergency} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    {c.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{c.location}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDateTime(c.created_at)}</span>
                    </span>
                    <span>Citizen: {c.citizen_name || "Citizen"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Score</span>
                    <span className="text-lg font-bold text-blue-400">{c.priority_score}</span>
                  </div>
                  <Link
                    to={`/track?id=${c.complaint_number}`}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View Timeline"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
