import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Shield,
    Activity,
    FileText,
    Building2,
    CheckSquare,
    BarChart3,
    LogOut,
    User,
    Calculator
} from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="glass-panel sticky top-0 z-50 rounded-none border-x-0 border-t-0 px-6 py-3 mb-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-2.5 text-xl font-extrabold text-white tracking-tight">
                    <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
                        <Shield className="w-6 h-6" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-[#a78bfa] bg-clip-text text-transparent">
                        InsureFlow
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        IRDAI Compliant
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                    <Link
                        to="/showcase"
                        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/showcase') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                    >
                        <Activity className="w-4 h-4 text-violet-400" />
                        Industry Architecture
                    </Link>

                    <Link
                        to="/simulator"
                        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/simulator') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                    >
                        <Calculator className="w-4 h-4" />
                        Simulator
                    </Link>

                    {user && (user.role === 'CLAIMANT' || user.role === 'SYSTEM') && (
                        <Link
                            to="/claimant"
                            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/claimant') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Claimant Portal
                        </Link>
                    )}

                    {user && (user.role === 'HOSPITAL_DESK' || user.role === 'SYSTEM') && (
                        <Link
                            to="/hospital"
                            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/hospital') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Hospital Desk
                        </Link>
                    )}

                    {user && ['VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'SYSTEM'].includes(user.role) && (
                        <Link
                            to="/insurer"
                            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/insurer') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Insurer Queue
                        </Link>
                    )}

                    {user && ['VERIFIER', 'APPROVER', 'FINANCE', 'MEDICAL_OFFICER', 'SYSTEM'].includes(user.role) && (
                        <Link
                            to="/analytics"
                            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive('/analytics') ? 'border-b-2 border-violet-400 text-white bg-slate-800/70' : 'border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analytics & FHIR
                        </Link>
                    )}
                </div>

                {/* User Info / Action */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-semibold text-white">{user.name}</div>
                                <div className="text-xs text-indigo-400 font-mono font-medium">{user.role}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-primary">
                            <User className="w-4 h-4" />
                            Login / Register
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
