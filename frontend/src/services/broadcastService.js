import api from "./api";

export const broadcastService = {
  // Public announcements for landing page and overview
  async getPublicBroadcasts() {
    const response = await api.get("/broadcasts");
    return response.data;
  },

  // Citizen's active notifications & advisories
  async getCitizenNotifications() {
    const response = await api.get("/citizen/notifications");
    return response.data;
  },

  // Officer / Department's managed broadcasts
  async getOfficerBroadcasts() {
    const response = await api.get("/officer/broadcasts");
    return response.data;
  },

  // Create new broadcast / direct alert
  async createBroadcast(payload) {
    const response = await api.post("/officer/broadcasts", payload);
    return response.data;
  },

  // Delete broadcast announcement (triggers live removal across citizens)
  async deleteBroadcast(broadcastId) {
    const response = await api.delete(`/officer/broadcasts/${broadcastId}`);
    return response.data;
  }
};
