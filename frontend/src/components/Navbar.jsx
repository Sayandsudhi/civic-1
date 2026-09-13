import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity, ShieldCheck, LogOut, User, Menu, X, PlusCircle, Search, LayoutDashboard, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationPanel from "./NotificationPanel";

export default function Navbar() {
  const { user, logout, isAuthenticated, isCitizen, isOfficer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardPath = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isOfficer) return "/department/dashboard";
    return "/user/dashboard";
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                CivicPulse
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Civic
              </span>
            </div>
            <span className="text-[10px] font-medium tracking-wide text-slate-400 block -mt-0.5">
              Municipal Issue Management
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link to="/" className={`hover:text-blue-400 transition-colors ${location.pathname === "/" ? "text-blue-400 font-semibold" : ""}`}>
            Overview
          </Link>
          <Link to="/track" className={`hover:text-blue-400 transition-colors flex items-center gap-1.5 ${location.pathname === "/track" ? "text-blue-400 font-semibold" : ""}`}>
            <Search className="w-4 h-4 text-slate-400" />
            Track Issue
          </Link>
        </nav>

        {/* Right CTA / Auth Status */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationPanel />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {isCitizen && (
                <Link
                  to="/complaints/new"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold shadow-xs border border-blue-500/30 flex items-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Report Issue
                </Link>
              )}

              <Link
                to={getDashboardPath()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                {isAdmin ? "Admin Command" : isOfficer ? `${user?.department_name || "Operations"}` : "My Dashboard"}
              </Link>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/complaints/new"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold shadow-xs border border-blue-500/30 flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Report an Issue
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <NotificationPanel />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3">
          <Link
            to="/"
            onClick={closeMobile}
            className="block text-sm font-medium text-slate-200 py-2 border-b border-slate-900"
          >
            Home
          </Link>
          <Link
            to="/track"
            onClick={closeMobile}
            className="block text-sm font-medium text-cyan-400 py-2 border-b border-slate-900"
          >
            Track Complaint
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={getDashboardPath()}
                onClick={closeMobile}
                className="block text-sm font-medium text-slate-200 py-2 border-b border-slate-900"
              >
                Go to Dashboard
              </Link>
              {isCitizen && (
                <Link
                  to="/complaints/new"
                  onClick={closeMobile}
                  className="block text-sm font-medium text-cyan-400 py-2 border-b border-slate-900"
                >
                  Raise Complaint
                </Link>
              )}
              <button
                onClick={() => {
                  closeMobile();
                  handleLogout();
                }}
                className="w-full text-left text-sm font-medium text-red-400 py-2"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMobile}
                className="block text-sm font-medium text-slate-200 py-2 border-b border-slate-900"
              >
                Citizen Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="block text-sm font-medium text-slate-200 py-2"
              >
                Register as Citizen
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
