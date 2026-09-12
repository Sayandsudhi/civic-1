import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

// Public Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TrackComplaint from "./pages/TrackComplaint";

// Citizen Pages
import UserDashboard from "./pages/user/Dashboard";
import NewComplaint from "./pages/user/NewComplaint";
import MyComplaints from "./pages/user/MyComplaints";
import ComplaintDetails from "./pages/user/ComplaintDetails";

// Department Officer Pages
import OfficerLogin from "./pages/department/Login";
import DepartmentDashboard from "./pages/department/Dashboard";
import OfficerComplaintDetails from "./pages/department/ComplaintDetails";

// Admin Pages
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminDepartments from "./pages/admin/Departments";
import AdminOfficers from "./pages/admin/Officers";
import AdminComplaints from "./pages/admin/Complaints";

// Citizen Entry Guard: navigating to /login
function CitizenEntryRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) {
    if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === "DEPARTMENT_OFFICER") return <Navigate to="/department/dashboard" replace />;
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Login />;
}

// Officer Entry Guard: navigating to /officer
function OfficerEntryRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.role === "DEPARTMENT_OFFICER") {
    return <Navigate to="/officer/dashboard" replace />;
  }
  return <OfficerLogin />;
}

// Admin Entry Guard: navigating to /admin
function AdminEntryRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <AdminLogin />;
}

// Shared Dashboard Layout Wrapper
function DashboardLayout({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
            <Navbar />
            
            <div className="flex-1">
              <Routes>
                {/* Public Citizen Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<CitizenEntryRoute />} />
                <Route path="/register" element={<Register />} />
                <Route path="/track" element={<TrackComplaint />} />

                {/* Citizen Authenticated Routes */}
                <Route
                  path="/complaints/new"
                  element={
                    <ProtectedRoute allowedRoles={["CITIZEN"]}>
                      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
                        <NewComplaint />
                      </main>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/dashboard"
                  element={
                    <DashboardLayout allowedRoles={["CITIZEN"]}>
                      <UserDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/user/complaints"
                  element={
                    <DashboardLayout allowedRoles={["CITIZEN"]}>
                      <MyComplaints />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/user/complaints/:id"
                  element={
                    <DashboardLayout allowedRoles={["CITIZEN"]}>
                      <ComplaintDetails />
                    </DashboardLayout>
                  }
                />

                {/* Department Officer Dedicated Portal (/officer) */}
                <Route path="/officer" element={<OfficerEntryRoute />} />
                <Route path="/officer/login" element={<OfficerEntryRoute />} />
                <Route path="/department/login" element={<OfficerEntryRoute />} />
                <Route
                  path="/officer/dashboard"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <DepartmentDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/department/dashboard"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <DepartmentDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/officer/resolved"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <DepartmentDashboard initialTab="RESOLVED" />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/department/resolved"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <DepartmentDashboard initialTab="RESOLVED" />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/officer/complaints/:id"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <OfficerComplaintDetails />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/department/complaints/:id"
                  element={
                    <DashboardLayout allowedRoles={["DEPARTMENT_OFFICER"]}>
                      <OfficerComplaintDetails />
                    </DashboardLayout>
                  }
                />

                {/* Administrator Dedicated Portal (/admin) */}
                <Route path="/admin" element={<AdminEntryRoute />} />
                <Route path="/admin/login" element={<AdminEntryRoute />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <DashboardLayout allowedRoles={["ADMIN"]}>
                      <AdminDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/admin/departments"
                  element={
                    <DashboardLayout allowedRoles={["ADMIN"]}>
                      <AdminDepartments />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/admin/officers"
                  element={
                    <DashboardLayout allowedRoles={["ADMIN"]}>
                      <AdminOfficers />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/admin/complaints"
                  element={
                    <DashboardLayout allowedRoles={["ADMIN"]}>
                      <AdminComplaints />
                    </DashboardLayout>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
