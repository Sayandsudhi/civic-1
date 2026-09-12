import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Send, 
  ShieldAlert, 
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { officerService } from "../../services/officerService";
import { formatDateTime } from "../../utils/priority";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";
import AIAnalysisCard from "../../components/AIAnalysisCard";
import ComplaintTimeline from "../../components/ComplaintTimeline";
import { useToast } from "../../context/ToastContext";
import { API_BASE_URL } from "../../services/api";

export default function OfficerComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusVal, setStatusVal] = useState("IN_PROGRESS");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [fieldNote, setFieldNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const data = await officerService.getDepartmentComplaintDetail(id);
      setComplaint(data);
      setStatusVal(data.status);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not access complaint details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const updated = await officerService.updateComplaintStatus(id, statusVal, statusNote.trim());
      setComplaint(updated);
      setStatusNote("");
      showToast(`Status updated to ${statusVal}`, "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update status", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!fieldNote.trim()) return;
    setAddingNote(true);
    try {
      const updated = await officerService.addOfficerNote(id, fieldNote.trim());
      setComplaint(updated);
      setFieldNote("");
      showToast("Inspection note added to audit trail.", "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to append note", "error");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 rounded-3xl glass-panel border border-red-500/40 text-center">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-red-300">Access Denied or Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">{error || "You do not have authorization to view this complaint."}</p>
        <Link to="/department/dashboard" className="mt-4 inline-block text-xs font-semibold text-cyan-400">
          ← Back to Operations Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/department/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Operations Queue
        </Link>

        <div className="flex items-center gap-2">
          <PriorityBadge level={complaint.priority_level} emergency={complaint.emergency} size="lg" />
          <StatusBadge status={complaint.status} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
                {complaint.complaint_number}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDateTime(complaint.created_at)}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white">{complaint.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>

            {complaint.location && (
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{complaint.location}</span>
              </div>
            )}

            {complaint.image_url && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Attached Field Evidence Photo:</h4>
                <a
                  href={`${API_BASE_URL}${complaint.image_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block"
                >
                  <img
                    src={`${API_BASE_URL}${complaint.image_url}`}
                    alt="Complaint Evidence"
                    className="max-h-80 rounded-2xl border border-slate-800 object-contain hover:opacity-90 transition-opacity bg-slate-950"
                  />
                </a>
              </div>
            )}
          </div>

          {/* AI Priority Analysis Card */}
          <AIAnalysisCard complaint={complaint} />

          {/* Action Timeline Audit */}
          <ComplaintTimeline currentStatus={complaint.status} updates={complaint.updates || []} />
        </div>

        {/* Right Col: Officer Operations Panel */}
        <div className="space-y-6">
          {/* Status Update Form */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Progress Workflow
            </h3>

            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Update Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="NEW">NEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status Transition Memo
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Electrical hazard isolated. Power restored on grid."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={updatingStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all disabled:opacity-50"
              >
                {updatingStatus ? "Saving..." : "Save Status Transition"}
              </button>
            </form>
          </div>

          {/* Add Field Note Form */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Append Inspection Note
            </h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={2}
                value={fieldNote}
                onChange={(e) => setFieldNote(e.target.value)}
                placeholder="Log internal field inspection remarks..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={addingNote}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Add Note to Log
              </button>
            </form>
          </div>

          {/* Reporting Citizen Info */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reporting Citizen Details
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-white">{complaint.citizen_name || "Citizen"}</span>
              </div>
              {complaint.citizen_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{complaint.citizen_email}</span>
                </div>
              )}
              {complaint.citizen_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{complaint.citizen_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
