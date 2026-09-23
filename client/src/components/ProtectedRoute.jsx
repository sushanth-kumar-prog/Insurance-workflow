import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-300">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <div className="p-8 text-center glass-panel max-w-lg mx-auto mt-20">
                <h2 className="text-2xl font-bold text-red-400 mb-2">403 Access Denied</h2>
                <p className="text-slate-400 mb-4">
                    Your role (<span className="text-amber-400 font-semibold">{user.role}</span>) does not have permission to view this portal.
                </p>
                <a href="/" className="btn-primary">Return to Home</a>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
