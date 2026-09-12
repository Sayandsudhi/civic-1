import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Lock, ShieldAlert, Calendar, MapPin, Building2, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { complaintService } from "../services/complaintService";
import { useAuth } from "../context/AuthContext";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";
import ComplaintTimeline from "../components/ComplaintTimeline";
import AIAnalysisCard from "../components/AIAnalysisCard";
import { formatDateTime } from "../utils/priority";
import { API_BASE_URL } from "../services/api";

export default function TrackComplaint() {
  const { user, isAuthenticated, isCitizen } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get("id") || "";

  const [complaintNumber, setComplaintNumber] = useState(queryId);
  const [complaint, setComplaint] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If citizen is logged in, fetch their own complaints list for quick selection
  useEffect(() => {
    async function loadUserComplaints() {
      if (isAuthenticated && isCitizen) {
        try {
          const list = await complaintService.getMyComplaints();
          setMyComplaints(list);
        } catch {}
      }
    }
    loadUserComplaints();
  }, [isAuthenticated, isCitizen]);

  const searchComplaint = async (num) => {
    if (!num.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await complaintService.trackComplaint(num.trim());
      setComplaint(data);
    } catch (err) {
      setComplaint(null);
      const msg = err.response?.data?.detail || "No complaint found with this reference number.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId && isAuthenticated) {
      setComplaintNumber(queryId);
      searchComplaint(queryId);
    }
  }, [queryId, isAuthenticated]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ id: complaintNumber.trim() });
    searchComplaint(complaintNumber);
  };

  // If user is not logged in, enforce security and prompt sign in
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign In Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            To protect privacy and safety data, <span className="text-blue-300 font-semibold">each user is strictly permitted to track only their own reported issues</span>.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs flex items-center justify-center gap-2 transition-all"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Register New Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400">
          <Search className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Track Your Complaint</h1>
        <p className="text-xs text-slate-400 mt-1">
          {isCitizen
            ? "Enter your unique complaint reference ID to view real-time AI priority scores and field team progress."
            : "Authorized departmental tracking console."}
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mt-6 flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="pl-3 text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            required
            value={complaintNumber}
            onChange={(e) => setComplaintNumber(e.target.value)}
            placeholder="e.g. CP-2026-000001"
            className="w-full bg-transparent px-3 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all whitespace-nowrap"
          >
            {loading ? "Searching..." : "Track Issue"}
          </button>
        </form>

        {/* One-Click Quick Select of Citizen's OWN Complaints */}
        {isCitizen && myComplaints.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Your Lodged Complaints (Click to track):
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {myComplaints.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setComplaintNumber(c.complaint_number);
                    setSearchParams({ id: c.complaint_number });
                    searchComplaint(c.complaint_number);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                    complaintNumber === c.complaint_number
                      ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  {c.complaint_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Access Denied or Not Found Error Banner */}
      {error && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-red-500/50 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-base font-bold text-red-300">{error}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Each citizen is only authorized to track complaints lodged under their own verified account.
          </p>
        </div>
      )}

      {/* Complaint Details Output */}
      {complaint && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-slate-200 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
                  {complaint.complaint_number}
                </span>
                <span className="text-xs font-semibold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  {complaint.department_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge level={complaint.priority_level} emergency={complaint.emergency} size="md" />
                <StatusBadge status={complaint.status} size="md" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white">{complaint.title}</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{complaint.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              {complaint.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {complaint.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDateTime(complaint.created_at)}
              </span>
            </div>

            {complaint.image_url && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <img
                  src={`${API_BASE_URL}${complaint.image_url}`}
                  alt="Incident"
                  className="rounded-2xl max-h-64 object-contain border border-slate-800 bg-slate-950"
                />
              </div>
            )}
          </div>

          {/* AI Priority Breakdown */}
          <AIAnalysisCard complaint={complaint} />

          {/* Timeline */}
          <ComplaintTimeline currentStatus={complaint.status} updates={complaint.updates || []} />
        </div>
      )}
    </div>
  );
}
