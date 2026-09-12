import React, { createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info", duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let bg = "bg-slate-900/90 border-slate-700 text-slate-100";
            let Icon = Info;
            let iconColor = "text-cyan-400";

            if (toast.type === "success") {
              bg = "bg-emerald-950/90 border-emerald-600/50 text-emerald-100";
              Icon = CheckCircle2;
              iconColor = "text-emerald-400";
            } else if (toast.type === "warning") {
              bg = "bg-amber-950/90 border-amber-600/50 text-amber-100";
              Icon = AlertTriangle;
              iconColor = "text-amber-400";
            } else if (toast.type === "error") {
              bg = "bg-red-950/90 border-red-600/50 text-red-100";
              Icon = AlertOctagon;
              iconColor = "text-red-400";
            } else if (toast.type === "emergency") {
              bg = "bg-red-950/95 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]";
              Icon = AlertOctagon;
              iconColor = "text-red-400 animate-pulse";
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 ${bg}`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
