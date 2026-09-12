import api from "./api";

export const complaintService = {
  async getDepartments() {
    const response = await api.get("/departments");
    return response.data;
  },

  async createComplaint(formData) {
    const response = await api.post("/complaints", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  async getMyComplaints() {
    const response = await api.get("/complaints/my");
    return response.data;
  },

  async getComplaint(id) {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },

  async trackComplaint(complaintNumber) {
    const response = await api.get(`/complaints/track/${encodeURIComponent(complaintNumber)}`);
    return response.data;
  }
};
