import api from "./api";

export const authService = {
  async register(data) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async loginCitizen(username_or_email, password) {
    const response = await api.post("/auth/login", { username_or_email, password });
    return response.data;
  },

  async loginOfficer(username, password) {
    const response = await api.post("/officer/login", { username, password });
    return response.data;
  },

  async loginAdmin(username, password) {
    const response = await api.post("/admin/login", { username, password });
    return response.data;
  },

  async getProfile() {
    const response = await api.get("/auth/me");
    return response.data;
  }
};
