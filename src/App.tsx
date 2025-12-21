import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EventResultsPage from "./pages/EventResultPage";
import EventTimingPage from "./pages/EventTimingPage";
import EventAdminTimesPage from "./pages/EventAdminTimesPage";
import EventAdminRacersPage from "./pages/EventAdminRacersPage";
import PublicResultsPage from "./pages/PublicResultsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/e/:eventId" element={<PublicResultsPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/events/:eventId/results"
            element={
              <ProtectedRoute>
                <EventResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/events/:eventId/timing"
            element={
              <ProtectedRoute>
                <EventTimingPage />
              </ProtectedRoute>
            }
          />

          {/* Optional admin pages per event */}
          <Route
            path="/app/events/:eventId/admin/times"
            element={
              <ProtectedRoute>
                <EventAdminTimesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/events/:eventId/admin/racers"
            element={
              <ProtectedRoute>
                <EventAdminRacersPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}