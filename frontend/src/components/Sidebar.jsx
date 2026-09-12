import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Building2, 
  Users, 
  ShieldAlert, 
  Settings, 
  BarChart3,
  Search,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { user, isCitizen, isOfficer, isAdmin } = useAuth();

  let navItems = [];

  if (isAdmin) {
    navItems = [
      { label: "Command Center", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "All Complaints", path: "/admin/complaints", icon: FileText },
      { label: "Departments", path: "/admin/departments", icon: Building2 },
      { label: "Officers Directory", path: "/admin/officers", icon: Users },
      { label: "Track System", path: "/track", icon: Search },
    ];
  } else if (isOfficer) {
    navItems = [
      { label: "Operations Queue", path: "/department/dashboard", icon: ShieldAlert },
      { label: "Resolved Archive", path: "/department/resolved", icon: CheckCircle2 },
      { label: "Track Issue", path: "/track", icon: Search },
    ];
  } else {
    // Citizen
    navItems = [
      { label: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
      { label: "My Complaints", path: "/user/complaints", icon: FileText },
      { label: "Raise New Issue", path: "/complaints/new", icon: PlusCircle },
      { label: "Track Issue", path: "/track", icon: Search },
    ];
  }

  return (
    <aside className="w-full md:w-64 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 shrink-0">
      {/* Role Profile summary */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-5 shadow-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
          {isAdmin ? "Platform Admin" : isOfficer ? "Officer in Charge" : "Citizen"}
        </div>
        <div className="text-sm font-semibold text-white truncate mt-0.5">
          {user?.full_name || "User"}
        </div>
        {user?.department_name && (
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            Dept: {user.department_name}
          </div>
        )}
      </div>

      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
