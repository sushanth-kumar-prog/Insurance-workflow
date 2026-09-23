import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import SimulatorPage from './pages/SimulatorPage';
import IndustryShowcasePage from './pages/IndustryShowcasePage';
import ClaimantPortal from './pages/ClaimantPortal';
import HospitalPortal from './pages/HospitalPortal';
import InsurerDashboard from './pages/InsurerDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/showcase" replace />;

  switch (user.role) {
    case 'CLAIMANT':
      return <Navigate to="/claimant" replace />;
    case 'HOSPITAL_DESK':
      return <Navigate to="/hospital" replace />;
    case 'VERIFIER':
    case 'MEDICAL_OFFICER':
    case 'APPROVER':
      return <Navigate to="/insurer" replace />;
    case 'FINANCE':
      return <Navigate to="/analytics" replace />;
    default:
      return <Navigate to="/simulator" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/showcase" element={<IndustryShowcasePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['CLAIMANT', 'SYSTEM']} />}>
                <Route path="/claimant" element={<ClaimantPortal />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['HOSPITAL_DESK', 'SYSTEM']} />}>
                <Route path="/hospital" element={<HospitalPortal />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'SYSTEM']} />}>
                <Route path="/insurer" element={<InsurerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['VERIFIER', 'APPROVER', 'FINANCE', 'MEDICAL_OFFICER', 'SYSTEM']} />}>
                <Route path="/analytics" element={<AnalyticsDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
