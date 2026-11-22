import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import FindCaregiver from "./pages/FindCaregiver";
import BecomeCaregiver from "./pages/BecomeCaregiver";
import RequestCaregiver from "./pages/RequestCaregiver";
import Emergency from "./pages/Emergency";
import CareseekerDashboard from "./pages/CareseekerDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import SmartScheduling from "./pages/SmartScheduling";
import PredictiveRequests from "./pages/PredictiveRequests";
import AdminDashboard from "./pages/AdminDashboard";
import NewRegistrations from "./pages/NewRegistrations";
import GiversSeekers from "./pages/GiversSeekers";
import ProtectedRoute from "./components/ProtectedRoute";
import { LanguageProvider } from "./lib/language";

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route path="/find-caregiver" element={<FindCaregiver />} />
          <Route path="/request-caregiver" element={<RequestCaregiver />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route
            path="/careseeker-dashboard"
            element={
              <ProtectedRoute allowedRoles={["careseeker"]}>
                <CareseekerDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/become-caregiver" element={<BecomeCaregiver />} />
          <Route
            path="/caregiver-dashboard"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <CaregiverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/smart-scheduling"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <SmartScheduling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictive-requests"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <PredictiveRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new-registrations"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <NewRegistrations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/givers-seekers"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <GiversSeekers />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
