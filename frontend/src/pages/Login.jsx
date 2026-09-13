import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.loginCitizen(identifier, password);
      if (data.user.role !== "CITIZEN") {
        const dest = data.user.role === "DEPARTMENT_OFFICER" ? "/officer" : "/admin";
        const roleLabel = data.user.role === "DEPARTMENT_OFFICER" ? "Department Officers" : "Administrators";
        setError(`Access denied: ${roleLabel} must sign in through their dedicated portal (${dest}).`);
        showToast(`This portal is for citizens only. Please use ${dest}.`, "error");
        return;
      }
      login(data.access_token, data.user);
      showToast(`Welcome back, ${data.user.full_name}!`, "success");
      const from = location.state?.from?.pathname || "/user/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Invalid email or password.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 p-8 shadow-xl relative">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Citizen Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to lodge issues, track resolutions, and review municipal progress.</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="citizen or citizen@example.com"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold shadow-xs border border-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Citizen Portal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>



        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-2.5 text-center text-xs text-slate-400">
          <div>
            Don't have an account?{" "}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Register as Citizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
