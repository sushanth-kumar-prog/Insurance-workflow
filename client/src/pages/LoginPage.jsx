import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, Building, UserCheck } from 'lucide-react';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('CLAIMANT');
    const [hospitalName, setHospitalName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                navigate('/');
            } else {
                await register({ name, email, password, role, hospitalName });
                // Auto login after register
                await login(email, password);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async (demoRole, demoEmail, demoName) => {
        setError('');
        setLoading(true);
        const demoPassword = 'Password123!';
        try {
            // Try logging in first
            await login(demoEmail, demoPassword);
            navigate('/');
        } catch (err) {
            // If user doesn't exist yet, register demo user then login
            try {
                await register({
                    name: demoName,
                    email: demoEmail,
                    password: demoPassword,
                    role: demoRole,
                    hospitalName: demoRole === 'HOSPITAL_DESK' ? 'City Care Eye Hospital' : undefined
                });
                await login(demoEmail, demoPassword);
                navigate('/');
            } catch (regErr) {
                setError('Failed to setup demo account automatically.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto my-12 p-8 glass-panel shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
                    <Shield className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-extrabold text-white">InsureFlow Portal</h1>
                <p className="text-sm text-slate-400 mt-1">Claim Settlement & RBAC Authentication</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-lg mb-6 border border-slate-800">
                <button
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    onClick={() => setIsLogin(true)}
                >
                    Sign In
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    onClick={() => setIsLogin(false)}
                >
                    Register
                </button>
            </div>

            {error && (
                <div className="p-3 mb-6 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                type="text"
                                required
                                placeholder="Dr. Rahul Verma"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                            type="email"
                            required
                            placeholder="user@insurance.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {!isLogin && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">User Role</label>
                            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full">
                                <option value="CLAIMANT">Claimant / Policyholder</option>
                                <option value="HOSPITAL_DESK">Hospital Desk Desk Officer</option>
                                <option value="VERIFIER">Insurer Claim Verifier</option>
                                <option value="MEDICAL_OFFICER">Medical Officer</option>
                                <option value="APPROVER">Senior Approver</option>
                                <option value="FINANCE">Finance & Settlement</option>
                            </select>
                        </div>

                        {role === 'HOSPITAL_DESK' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Hospital Name</label>
                                <div className="relative">
                                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        placeholder="City Eye Care Super Specialty"
                                        value={hospitalName}
                                        onChange={(e) => setHospitalName(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5 mt-2">
                    {loading ? 'Authenticating...' : isLogin ? 'Sign In to Portal' : 'Create Account'}
                </button>
            </form>

            {/* Quick Demo Login Shortcuts */}
            <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Quick 1-Click Demo Login
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('CLAIMANT', 'patient@demo.com', 'Patient Sushanth')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        👤 Claimant
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('HOSPITAL_DESK', 'hospital@demo.com', 'Hospital Admin')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        🏥 Hospital Desk
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('VERIFIER', 'verifier@demo.com', 'Verifier Officer')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        🔍 Claim Verifier
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('MEDICAL_OFFICER', 'medical@demo.com', 'Dr. Medical Officer')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        🩺 Medical Officer
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('APPROVER', 'approver@demo.com', 'Chief Approver')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        ⚡ Chief Approver
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDemoLogin('FINANCE', 'finance@demo.com', 'Finance Manager')}
                        className="p-2 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-left transition-colors"
                    >
                        💳 Finance Desk
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
