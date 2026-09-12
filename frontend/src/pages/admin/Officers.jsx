import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  Mail, 
  Phone,
  Eye,
  EyeOff
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { useToast } from "../../context/ToastContext";

export default function AdminOfficers() {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [oList, dList] = await Promise.all([
        adminService.getOfficers(),
        adminService.getDepartments()
      ]);
      setOfficers(oList);
      setDepartments(dList);
    } catch (err) {
      showToast("Failed to load officer data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingOfficer(null);
    setFullName("");
    setUsername("");
    setEmail("");
    setPhone("");
    setDepartmentId(departments[0]?.id || "");
    setBadgeNumber("");
    setPassword("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (officer) => {
    setEditingOfficer(officer);
    setFullName(officer.full_name);
    setUsername(officer.username);
    setEmail(officer.email);
    setPhone(officer.phone || "");
    setDepartmentId(officer.department_id);
    setBadgeNumber(officer.badge_number || "");
    setPassword(""); // Do not show existing hashed password
    setIsActive(officer.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departmentId) {
      showToast("Please assign a department.", "warning");
      return;
    }
    setSaving(true);
    try {
      if (editingOfficer) {
        const payload = {
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          department_id: parseInt(departmentId),
          badge_number: badgeNumber.trim() || null,
          is_active: isActive
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await adminService.updateOfficer(editingOfficer.id, payload);
        showToast(`Officer '${fullName}' updated successfully.`, "success");
      } else {
        if (!password.trim()) {
          showToast("Password is required for new accounts.", "warning");
          setSaving(false);
          return;
        }
        await adminService.createOfficer({
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim() || null,
          department_id: parseInt(departmentId),
          badge_number: badgeNumber.trim() || null,
          is_active: isActive
        });
        showToast(`Officer '${fullName}' created.`, "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || "Operation failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (officer) => {
    try {
      await adminService.updateOfficer(officer.id, { is_active: !officer.is_active });
      showToast(`Officer '${officer.full_name}' ${officer.is_active ? "disabled" : "enabled"}.`, "info");
      loadData();
    } catch (err) {
      showToast("Failed to toggle officer status.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Department Officers</h1>
          <p className="text-xs text-slate-400 mt-1">Manage departmental dispatch officers, credential provisioning, and role assignment.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Provision Officer
        </button>
      </div>

      {/* Officers Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Officer Name</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Badge / Phone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading officers...</td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No officers provisioned yet.</td>
                </tr>
              ) : (
                officers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                          {officer.full_name.charAt(0)}
                        </div>
                        <div>
                          <div>{officer.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{officer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-cyan-400">{officer.username}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-800/80 px-2 py-0.5 rounded text-slate-200">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        {officer.department_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>{officer.badge_number || "—"}</div>
                      <div className="text-[10px] text-slate-500">{officer.phone || "—"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {officer.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(officer)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Officer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(officer)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          officer.is_active
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={officer.is_active ? "Deactivate" : "Activate"}
                      >
                        {officer.is_active ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Officer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">
                {editingOfficer ? "Edit Officer Profile" : "Provision Department Officer"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Er. Rajesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="officer_kseb"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Badge Number
                  </label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    placeholder="e.g. KSEB-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@civicpulse.gov"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 94470 11223"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Assign Department *
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  {editingOfficer ? "Set New Password (leave blank to keep current)" : "Password *"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingOfficer ? "••••••••" : "Min. 6 characters"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="officerActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="officerActive" className="text-xs text-slate-300 font-medium">
                  Active authorization
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : editingOfficer ? "Update Officer" : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
