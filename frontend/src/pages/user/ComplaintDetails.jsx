import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Building2, User, Image as ImageIcon } from "lucide-react";
import { complaintService } from "../../services/complaintService";
import { formatDateTime } from "../../utils/priority";
import PriorityBadge from "../../components/PriorityBadge";
import StatusBadge from "../../components/StatusBadge";
import AIAnalysisCard from "../../components/AIAnalysisCard";
import ComplaintTimeline from "../../components/ComplaintTimeline";
import { API_BASE_URL } from "../../services/api";

export default function ComplaintDetails() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadComplaint() {
      try {
        const data = await complaintService.getComplaint(id);
        setComplaint(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Could not retrieve complaint.");
      } finally {
        setLoading(false);
      }
    }
    loadComplaint();
  }, [id]);

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
        <h3 className="text-lg font-bold text-red-300">Complaint Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">{error || "The requested issue does not exist."}</p>
        <Link to="/user/dashboard" className="mt-4 inline-block text-xs font-semibold text-cyan-400">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/user/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Complaints
        </Link>

        <div className="flex items-center gap-2">
          <PriorityBadge level={complaint.priority_level} emergency={complaint.emergency} size="lg" />
          <StatusBadge status={complaint.status} size="lg" />
        </div>
      </div>

      {/* Main Issue Card */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
              {complaint.complaint_number}
            </span>
            <span className="text-xs font-semibold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              {complaint.department_name}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formatDateTime(complaint.created_at)}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{complaint.title}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>
        </div>

        {complaint.location && (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{complaint.location}</span>
          </div>
        )}

        {/* Uploaded Image Preview */}
        {complaint.image_url && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h5 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              Attached Incident Photo
            </h5>
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-w-md bg-slate-950">
              <img
                src={`${API_BASE_URL}${complaint.image_url}`}
                alt="Incident"
                className="w-full h-auto max-h-72 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Prioritization Detailed Analysis */}
      <AIAnalysisCard complaint={complaint} />

      {/* Status Progress Timeline & Officer Response */}
      <ComplaintTimeline currentStatus={complaint.status} updates={complaint.updates || []} />
    </div>
  );
}
