import api from "./api";

export const adminService = {
  async getDashboardAnalytics() {
    const response = await api.get("/admin/dashboard");
    return response.data;
  },

  async getAllComplaints(filters = {}) {
    const response = await api.get("/admin/complaints", { params: filters });
    return response.data;
  },

  // Departments
  async getDepartments() {
    const response = await api.get("/admin/departments");
    return response.data;
  },

  async createDepartment(data) {
    const response = await api.post("/admin/departments", data);
    return response.data;
  },

  async updateDepartment(id, data) {
    const response = await api.put(`/admin/departments/${id}`, data);
    return response.data;
  },

  async deleteDepartment(id) {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data;
  },

  // Officers
  async getOfficers() {
    const response = await api.get("/admin/officers");
    return response.data;
  },

  async createOfficer(data) {
    const response = await api.post("/admin/officers", data);
    return response.data;
  },

  async updateOfficer(id, data) {
    const response = await api.put(`/admin/officers/${id}`, data);
    return response.data;
  },

  async deleteOfficer(id) {
    const response = await api.delete(`/admin/officers/${id}`);
    return response.data;
  }
};
