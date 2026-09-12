import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, PlusCircle, Filter } from "lucide-react";
import { complaintService } from "../../services/complaintService";
import ComplaintCard from "../../components/ComplaintCard";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await complaintService.getMyComplaints();
        setComplaints(data);
      } catch (err) {
        console.error("Error loading complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.complaint_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">My Reported Issues</h2>
          <p className="text-xs text-slate-400 mt-1">Review your full history of complaints, AI priority decisions, and municipal team updates.</p>
        </div>
        <Link
          to="/complaints/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          File New Issue
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, keyword, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "NEW", "IN_PROGRESS", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-xs border border-blue-500/40"
                  : "bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {st === "ALL" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
          No complaints match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <ComplaintCard key={c.id} complaint={c} linkPrefix="/user/complaints" />
          ))}
        </div>
      )}
    </div>
  );
}
