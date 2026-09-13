import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Building2, 
  CheckCheck,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { broadcastService } from "../services/broadcastService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { API_BASE_URL } from "../services/api";

function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp - now;
  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const remMins = diffMins % 60;

  if (days > 0) return `${days}d ${remHours}h left`;
  if (hours > 0) return `${hours}h ${remMins}m left`;
  return `${diffMins}m left`;
}

export default function NotificationPanel() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("ALL"); // ALL, EMERGENCY, ADVISORY
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const getStorageKey = () => `civicpulse_last_read_ts_${user?.id || "guest"}`;

  const calculateUnread = (items) => {
    if (!items || items.length === 0) return 0;
    const lastRead = localStorage.getItem(getStorageKey());
    if (!lastRead) return items.length;
    const lastReadTime = new Date(lastRead).getTime();
    return items.filter((item) => {
      const itemTime = new Date(item.created_at || item.updated_at).getTime();
      return itemTime > lastReadTime;
    }).length;
  };

  const markAsRead = () => {
    localStorage.setItem(getStorageKey(), new Date().toISOString());
    setUnreadCount(0);
  };

  const handleToggleBell = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      markAsRead();
    }
  };

  // Load notifications from server
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = isAuthenticated 
        ? await broadcastService.getCitizenNotifications()
        : await broadcastService.getPublicBroadcasts();
      const now = new Date();
      const list = (data || []).filter(
        (item) => !item.expires_at || new Date(item.expires_at) > now
      );
      setNotifications(list);
      setUnreadCount(calculateUnread(list));
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated, user?.id]);

  // Periodic interval to automatically drop expired notifications
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications((prev) =>
        prev.filter((item) => !item.expires_at || new Date(item.expires_at) > new Date())
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Real-time WebSocket connection for instant broadcast arrival and instant deletion
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.host;

    if (API_BASE_URL) {
      try {
        const parsed = new URL(API_BASE_URL);
        host = parsed.host;
        protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      } catch {}
    }

    const wsUrl = `${protocol}//${host}/ws/citizen/${user.id}`;
    let socket = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "NEW_BROADCAST" && data.broadcast) {
            setNotifications((prev) => {
              // Avoid duplicates
              if (prev.some((b) => b.id === data.broadcast.id)) return prev;
              return [data.broadcast, ...prev];
            });
            setUnreadCount((c) => c + 1);

            const isUrgent = data.broadcast.alert_type === "EMERGENCY" || data.broadcast.alert_type === "WARNING";
            showToast(
              `📢 ${data.broadcast.department_name}: ${data.broadcast.title}`,
              isUrgent ? "emergency" : "info"
            );
          } else if (data.type === "BROADCAST_DELETED" && data.broadcast_id) {
            // Instantly delete from panel in real-time when officer deletes it
            setNotifications((prev) => prev.filter((b) => b.id !== data.broadcast_id));
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        } catch (e) {
          console.error("Failed parsing citizen WS message:", e);
        }
      };
    } catch (err) {
      console.log("WebSocket init skipped:", err);
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [isAuthenticated, user?.id]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "EMERGENCY") return n.alert_type === "EMERGENCY" || n.alert_type === "WARNING";
    if (filter === "ADVISORY") return n.alert_type === "ADVISORY" || n.alert_type === "INFO";
    return true;
  });

  const getAlertStyle = (type) => {
    switch (type) {
      case "EMERGENCY":
        return {
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          dot: "bg-rose-500"
        };
      case "WARNING":
        return {
          badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
          dot: "bg-orange-500"
        };
      case "ADVISORY":
        return {
          badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          icon: <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
          dot: "bg-blue-500"
        };
      default:
        return {
          badge: "bg-slate-500/15 text-slate-300 border-slate-700/50",
          icon: <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
          dot: "bg-slate-400"
        };
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggleBell}
        title="Municipal Alerts & Notifications"
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors focus:outline-none"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] sm:w-[420px] max-h-[520px] rounded-2xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Municipal Announcements</h3>
                <p className="text-[11px] text-slate-400">Ward bulletins & department updates</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={markAsRead}
                title="Mark all as read"
                className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                Mark read
              </button>
              <button
                onClick={loadNotifications}
                title="Refresh notifications"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2">
            {[
              { id: "ALL", label: "All Alerts" },
              { id: "EMERGENCY", label: "Urgent Hazards" },
              { id: "ADVISORY", label: "Maintenance" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                  filter === t.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-500 font-mono">
              {filteredNotifications.length} active
            </span>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-800/50 flex-1 max-h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-2">
                  <CheckCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-slate-300">All clear in your municipal area</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                  No active disruptions or emergency alerts posted by municipal officers.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const style = getAlertStyle(item.alert_type);
                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-800/35 transition-colors group relative"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {style.icon}
                          {item.alert_type}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {item.department_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.expires_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            {formatRemainingTime(item.expires_at)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        {item.target_ward || "All Wards"}
                      </span>
                      <span className="text-slate-500">
                        Issued by: {item.created_by_name || "Department Squad"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-950/60 border-t border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-medium">
              Live updates via Municipal Central Dispatch • CivicPulse AI
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
