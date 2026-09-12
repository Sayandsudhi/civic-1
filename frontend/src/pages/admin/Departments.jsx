import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Users, 
  FileText 
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { useToast } from "../../context/ToastContext";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDepartments();
      setDepartments(data);
    } catch (err) {
      showToast("Failed to load departments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormName("");
    setFormCode("");
    setFormDesc("");
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormDesc(dept.description || "");
    setFormActive(dept.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await adminService.updateDepartment(editingDept.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          is_active: formActive
        });
        showToast(`Department '${formName}' updated.`, "success");
      } else {
        await adminService.createDepartment({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDesc.trim(),
          is_active: formActive
        });
        showToast(`Department '${formName}' created.`, "success");
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err) {
      showToast(err.response?.data?.detail || "Operation failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept) => {
    try {
      await adminService.updateDepartment(dept.id, { is_active: !dept.is_active });
      showToast(`Department '${dept.name}' ${dept.is_active ? "disabled" : "enabled"}.`, "info");
      loadDepartments();
    } catch (err) {
      showToast("Failed to change department state.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Municipal Departments</h1>
          <p className="text-xs text-slate-400 mt-1">Configure active civic departments, dispatch authorities, and assign officers.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold border border-blue-500/30 shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Departments Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Complaints</th>
                <th className="py-3.5 px-4">Officers</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading departments...</td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No departments configured.</td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{dept.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal line-clamp-1">{dept.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{dept.code}</td>
                    <td className="py-3.5 px-4 font-bold">{dept.complaints_count || 0}</td>
                    <td className="py-3.5 px-4 font-bold">{dept.active_officers_count || 0}</td>
                    <td className="py-3.5 px-4">
                      {dept.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Department"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(dept)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          dept.is_active
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={dept.is_active ? "Disable Department" : "Enable Department"}
                      >
                        {dept.is_active ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">
                {editingDept ? "Edit Department" : "Add Municipal Department"}
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
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Road Safety"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {!editingDept && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g., ROAD_SAFETY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Scope of responsibilities and municipal jurisdiction..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="activeCheck" className="text-xs text-slate-300 font-medium">
                  Active for citizen reporting
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
                  {saving ? "Saving..." : editingDept ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
