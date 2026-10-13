import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PersonaBar from './components/PersonaBar';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import IndustryShowcasePage from './pages/IndustryShowcasePage';
import SimulatorPage from './pages/SimulatorPage';
import ClaimantPortal from './pages/ClaimantPortal';
import HospitalPortal from './pages/HospitalPortal';
import InsurerDashboard from './pages/InsurerDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import DashboardPage from './pages/DashboardPage';
import ClaimsPage from './pages/ClaimsPage';
import PreAuthPage from './pages/PreAuthPage';
import PoliciesPage from './pages/PoliciesPage';
import NotFoundPage from './pages/NotFoundPage';

const HomeRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
};

/** Wraps a page in the 3-panel shell with the right heading. */
const Shell = ({ title, children }) => <AppLayout title={title}>{children}</AppLayout>;

/** Keeps role-specific portals reachable from their legacy paths. */
const Portal = ({ title, allowedRoles, component: Page }) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
        <Shell title={title}><Page /></Shell>
    </ProtectedRoute>
);

function App() {
    // PersonaBar is position:fixed, so every route needs top clearance.
    const personaBarVisible =
        import.meta.env.VITE_ENABLE_PERSONA_BAR === 'true' || import.meta.env.DEV;

    return (
        <AuthProvider>
            <BrowserRouter>
                <div className={`min-h-screen bg-[#EBF4FD] text-[#1A2130] font-sans ${personaBarVisible ? 'pt-10' : ''}`}>
                    <PersonaBar />
                    <Routes>
                        <Route path="/" element={<HomeRedirect />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/showcase" element={<IndustryShowcasePage />} />
                        <Route path="/simulator" element={<SimulatorPage />} />

                        {/* 3-panel shell routes */}
                        <Route element={<ProtectedRoute allowedRoles={['CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE']} />}>
                            <Route path="/dashboard" element={<Shell title="Dashboard"><DashboardPage /></Shell>} />
                            <Route path="/claims" element={<Shell title="Claims"><ClaimsPage /></Shell>} />
                            <Route path="/preauth" element={<Shell title="Pre-Auth"><PreAuthPage /></Shell>} />
                            <Route path="/policies" element={<Shell title="Policies"><PoliciesPage /></Shell>} />
                        </Route>

                        {/* Role-specific portals (legacy paths preserved) */}
                        <Route path="/claimant" element={<Portal title="Claimant Portal" allowedRoles={['CLAIMANT', 'SYSTEM']} component={ClaimantPortal} />} />
                        <Route path="/hospital" element={<Portal title="Hospital Portal" allowedRoles={['HOSPITAL_DESK', 'SYSTEM']} component={HospitalPortal} />} />
                        <Route path="/insurer" element={<Portal title="Insurer Console" allowedRoles={['VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'SYSTEM']} component={InsurerDashboard} />} />
                        <Route path="/analytics" element={<Portal title="Analytics" allowedRoles={['VERIFIER', 'APPROVER', 'FINANCE', 'MEDICAL_OFFICER', 'SYSTEM']} component={AnalyticsDashboard} />} />

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
