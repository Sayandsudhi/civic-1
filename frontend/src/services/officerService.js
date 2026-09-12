import api from "./api";

export const officerService = {
  async getDepartmentComplaints(statusFilter = "ALL") {
    const params = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};
    const response = await api.get("/officer/complaints", { params });
    return response.data;
  },

  async getDepartmentComplaintDetail(id) {
    const response = await api.get(`/officer/complaints/${id}`);
    return response.data;
  },

  async updateComplaintStatus(id, status, note = "") {
    const response = await api.put(`/officer/complaints/${id}/status`, { status, note });
    return response.data;
  },

  async addOfficerNote(id, note) {
    const response = await api.post(`/officer/complaints/${id}/update`, { note });
    return response.data;
  }
};
