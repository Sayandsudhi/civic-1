import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Activity, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Building2, 
  Car, 
  UtensilsCrossed, 
  Droplets, 
  Trash2, 
  HeartPulse,
  Sparkles,
  BarChart3,
  Users,
  ShieldCheck
} from "lucide-react";
import { complaintService } from "../services/complaintService";
import PriorityBadge from "../components/PriorityBadge";

export default function Landing() {
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState("");
  const [departments, setDepartments] = useState([]);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function loadDepts() {
      try {
        const data = await complaintService.getDepartments();
        setDepartments(data);
      } catch {}
    }
    loadDepts();
  }, []);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackId.trim()) {
      navigate(`/track?id=${encodeURIComponent(trackId.trim())}`);
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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-14 pb-18 md:pt-20 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-6">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Municipal Operations & Citizen Services
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Report problems. <br />
              <span className="text-blue-500">
                Prioritize safety.
              </span> <br />
              Protect your city.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              An intelligent civic issue management platform connecting citizens with municipal departments to identify, evaluate, and resolve public hazards with accountability.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              <Link
                to="/complaints/new"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold shadow-sm border border-blue-500/30 flex items-center gap-2 transition-all"
              >
                Report an Issue
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/track"
                className="px-6 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-sm font-semibold border border-slate-700/80 transition-colors shadow-xs"
              >
                Track Complaint
              </Link>
            </div>

            {/* Quick Track Bar */}
            <form onSubmit={handleTrackSubmit} className="mt-8 max-w-md mx-auto lg:mx-0 flex items-center p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xs">
              <div className="pl-3 text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter complaint reference ID (e.g. CP-2026-000001)"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shadow-xs"
              >
                Track
              </button>
            </form>
          </div>

          {/* Right Column: Hero Video Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[500px] rounded-2xl border border-slate-800 p-2 shadow-xl bg-slate-900/90 overflow-hidden">
              <video
                ref={videoRef}
                src="/first.mp4"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                controls={false}
                className="w-full h-full object-cover rounded-xl pointer-events-none select-none"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">Standard Operating Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">How CivicPulse Operates</h2>
            <p className="text-slate-400 text-sm mt-3">
              From report submission to field officer resolution, every complaint follows an auditable, prioritized civic lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Citizen Reports",
                desc: "Submit a photo, pinpoint GPS location, and describe public hazards in simple terms.",
                icon: Activity
              },
              {
                step: "02",
                title: "Safety Evaluation",
                desc: "Automated analysis evaluates severity, public impact, and hazard risks into structured metrics.",
                icon: Cpu
              },
              {
                step: "03",
                title: "Priority Ordering",
                desc: "Critical safety threats (fires, open lines, structural damage) are elevated to top dispatch queues.",
                icon: ShieldAlert
              },
              {
                step: "04",
                title: "Field Resolution",
                desc: "Assigned department squads verify, take action on-site, and record transparent resolution notes.",
                icon: CheckCircle2
              }
            ].map((item) => (
              <div key={item.step} className="p-6 rounded-xl bg-slate-900/70 border border-slate-800/90 relative group hover:border-slate-700 transition-colors shadow-xs">
                <span className="text-3xl font-bold text-slate-700 group-hover:text-blue-500/40 transition-colors">
                  {item.step}
                </span>
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">Public Departments</span>
            <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">Participating Municipal Authorities</h2>
          </div>
          <Link to="/complaints/new" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
            File an issue in your department <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const Icon = departmentIcons[dept.code] || Building2;
            return (
              <div key={dept.id} className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{dept.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{dept.code}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{dept.description}</p>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>{dept.complaints_count || 0} Reported Issues</span>
                  <Link to={`/complaints/new?dept=${dept.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                    Report Here →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why CivicPulse */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">Civic Accountability</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 leading-tight tracking-tight">
                Eliminating municipal backlog with systematic issue triage.
              </h2>
              <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                Traditional municipal complaint boxes treat all submissions first-come, first-served. CivicPulse ensures life-threatening public hazards (electrical line snaps, road cave-ins, water contamination) are routed directly to on-call squads instantly.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Deterministic Emergency Override for immediate safety threats",
                  "Standardized multi-factor priority evaluation (0-100 severity)",
                  "Department-scoped operations queues with real-time audit trail",
                  "Direct public timeline tracking with official resolution notes"
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual KPI comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-xs">
                <div className="text-3xl font-bold text-blue-400">92%</div>
                <div className="text-xs text-slate-200 mt-2 font-medium">Faster Response Time</div>
                <p className="text-[11px] text-slate-400 mt-1">Direct dispatch to on-duty field squads.</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-xs">
                <div className="text-3xl font-bold text-emerald-400">100%</div>
                <div className="text-xs text-slate-200 mt-2 font-medium">Audit Compliance</div>
                <p className="text-[11px] text-slate-400 mt-1">Every status change includes officer notes.</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-xs">
                <div className="text-3xl font-bold text-indigo-400">24/7</div>
                <div className="text-xs text-slate-200 mt-2 font-medium">System Availability</div>
                <p className="text-[11px] text-slate-400 mt-1">Round-the-clock incident recording.</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-xs">
                <div className="text-3xl font-bold text-amber-400">&lt; 1 min</div>
                <div className="text-xs text-slate-200 mt-2 font-medium">Department Routing</div>
                <p className="text-[11px] text-slate-400 mt-1">Instant classification into queue.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold text-white">CivicPulse</span>
            </div>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="text-xs text-slate-500">Official Municipal Public Safety Platform</span>
          </div>

          <div className="text-xs text-slate-400">
            Made by <span className="text-slate-300 font-medium">Nikitha, Daya, Uditha, Ahal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
