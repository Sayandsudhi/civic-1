import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (allowedRoles.includes("ADMIN")) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (allowedRoles.includes("DEPARTMENT_OFFICER")) {
      return <Navigate to="/department/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to proper destination based on actual role
    if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === "DEPARTMENT_OFFICER") return <Navigate to="/department/dashboard" replace />;
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}
