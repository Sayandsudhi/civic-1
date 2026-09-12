import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  PlusCircle, 
  MapPin, 
  Image as ImageIcon, 
  X, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  Building2,
  Car,
  UtensilsCrossed,
  Droplets,
  Trash2,
  HeartPulse
} from "lucide-react";
import { complaintService } from "../../services/complaintService";
import { useToast } from "../../context/ToastContext";
import AIAnalysisModal from "../../components/AIAnalysisModal";

const HAZARD_KEYWORDS = [
  "live wire", "electric wire", "sparking", "shock", "fire", "explosion", 
  "gas leak", "collapsed", "sinkhole", "open manhole", "fatal", "high-voltage"
];

export default function NewComplaint() {
  const [searchParams] = useSearchParams();
  const initialDept = searchParams.get("dept") ? parseInt(searchParams.get("dept")) : "";

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(initialDept);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [createdComplaintId, setCreatedComplaintId] = useState(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDepts() {
      try {
        const data = await complaintService.getDepartments();
        setDepartments(data);
        if (!departmentId && data.length > 0) {
          setDepartmentId(data[0].id);
        }
      } catch (err) {
        showToast("Failed to fetch departments.", "error");
      }
    }
    loadDepts();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size must be under 5MB.", "warning");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  // Real-time hazard keyword detection
  const detectedHazard = HAZARD_KEYWORDS.some((k) =>
    `${title} ${description}`.toLowerCase().includes(k)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departmentId) {
      showToast("Please select a responsible department.", "warning");
      return;
    }
    if (title.trim().length < 5) {
      showToast("Title must be at least 5 characters.", "warning");
      return;
    }
    if (description.trim().length < 10) {
      showToast("Description must be at least 10 characters.", "warning");
      return;
    }

    setSubmitting(true);
    setShowAIModal(true);

    const formData = new FormData();
    formData.append("department_id", departmentId);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    if (location.trim()) formData.append("location", location.trim());
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await complaintService.createComplaint(formData);
      setAnalysisResult(res);
      setCreatedComplaintId(res.id);
      showToast("Complaint submitted & prioritized by AI!", "success");
    } catch (err) {
      setShowAIModal(false);
      const msg = err.response?.data?.detail || "Failed to submit complaint. Please check your connection.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowAIModal(false);
    navigate("/user/dashboard");
  };

  const handleViewComplaint = () => {
    setShowAIModal(false);
    if (createdComplaintId) {
      navigate(`/user/complaints/${createdComplaintId}`);
    } else {
      navigate("/user/dashboard");
    }
  };

  const departmentIcons = {
    ROAD_SAFETY: Car,
    KSEB_ELECTRICITY: Zap,
    FOOD_SAFETY: UtensilsCrossed,
    WATER_SUPPLY: Droplets,
    SANITATION_WASTE: Trash2,
    PUBLIC_HEALTH: HeartPulse,
  };

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Report a Public Issue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Describe the civic problem. The system evaluates safety urgency and automatically routes to the appropriate municipal department.
          </p>
        </div>

        {/* Real-time hazard indicator banner */}
        {detectedHazard && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <Zap className="w-5 h-5 text-rose-400 fill-rose-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-semibold text-rose-300">Hazardous Condition Pattern Detected</h5>
              <p className="text-[11px] text-rose-200/80 mt-0.5 leading-relaxed">
                Your report mentions a critical public safety threat. The system will flag this for immediate high-priority dispatch.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Responsible Department *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {departments.map((d) => {
                const isSelected = departmentId === d.id;
                const Icon = departmentIcons[d.code] || Building2;
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDepartmentId(d.id)}
                    className={`p-3 rounded-xl text-left border flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-xs"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-400" : "text-slate-400"}`} />
                    <span className="text-xs font-medium truncate">{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Complaint Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Live electrical wire sparking near bus stop on MG Road"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, exact danger or hazard, how many people are affected, or vehicle risk..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors leading-relaxed"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Safety checks evaluate hazard keywords, urgency scale, and community risk automatically.
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Specific Location / Landmark (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Near St. Mary's School entrance, Pillar 42"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Attach Incident Photo (Optional)
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-48 w-full bg-slate-950 flex items-center justify-center">
                <img src={imagePreview} alt="Preview" className="max-h-48 object-contain" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl cursor-pointer bg-slate-950/40 transition-colors">
                <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-xs font-medium text-slate-300">Click to upload incident photo</span>
                <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold shadow-xs border border-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Incident Report
            </button>
          </div>
        </form>
      </div>

      {/* AI Prioritization Interactive Modal */}
      <AIAnalysisModal
        isOpen={showAIModal}
        result={analysisResult}
        onClose={handleModalClose}
        onViewComplaint={handleViewComplaint}
      />
    </div>
  );
}
