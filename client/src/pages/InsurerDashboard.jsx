import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SlaBadge from '../components/SlaBadge';
import ClauseTable from '../components/ClauseTable';
import {
    CheckSquare,
    Play,
    AlertCircle,
    CheckCircle,
    XCircle,
    CreditCard,
    Clock,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react';

const InsurerDashboard = () => {
    const { user } = useAuth();
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState('');
    const [queryNote, setQueryNote] = useState('');

    const fetchClaimsQueue = async () => {
        try {
            const res = await api.get('/claims/all');
            setClaims(res.data.claims || []);
            if (res.data.claims && res.data.claims.length > 0) {
                setSelectedClaim(res.data.claims[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAudit = async (claimId) => {
        try {
            const res = await api.get(`/claims/${claimId}/audit-trail`);
            setAuditLogs(res.data.logs || []);
        } catch (err) {
            setAuditLogs([]);
        }
    };

    useEffect(() => {
        fetchClaimsQueue();
    }, []);

    useEffect(() => {
        if (selectedClaim) {
            fetchAudit(selectedClaim._id);
        }
    }, [selectedClaim]);

    // Execute Step 1 Adjudication Rule Engine
    const handleAdjudicate = async () => {
        if (!selectedClaim) return;
        setActionMsg('');
        try {
            const res = await api.post(`/claims/${selectedClaim._id}/adjudicate`);
            setSelectedClaim(res.data.claim);
            setActionMsg('Executed Step 1 Rule Engine! Adjudication breakdown calculated and saved to DB.');
            fetchClaimsQueue();
        } catch (err) {
            alert(err.response?.data?.error || 'Adjudication failed');
        }
    };

    // State Transition Handlers
    const handleTransition = async (targetState, actionName, defaultNotes = '') => {
        if (!selectedClaim) return;
        setActionMsg('');
        try {
            const res = await api.post(`/claims/${selectedClaim._id}/transition`, {
                targetState,
                action: actionName,
                notes: queryNote || defaultNotes
            });
            setSelectedClaim(res.data.claim);
            setActionMsg(`Transitioned state to ${targetState}. Audit log appended.`);
            setQueryNote('');
            fetchClaimsQueue();
        } catch (err) {
            alert(err.response?.data?.error || 'Transition failed');
        }
    };

    // Mock SLA calculation for UI live clock
    const getSlaRemaining = (claim) => {
        const isPaused = claim.status === 'QUERY_RAISED';
        const limit = claim.claimType === 'CASHLESS' ? 60 : 180;
        // mock elapsed 25 mins
        const elapsed = 25;
        const remaining = limit - elapsed;
        const status = remaining <= 0 ? 'BREACHED' : remaining <= 15 ? 'WARNING' : 'ON_TIME';
        return { remaining, status, isPaused };
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[#1565D8] font-semibold text-sm mb-1">
                        <CheckSquare className="w-4 h-4" />
                        Insurer & Medical Officer Operations Queue
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">Insurer Adjudication & SLA Control Dashboard</h1>
                    <p className="text-[#6B7A94] text-sm mt-1">
                        Active Role: <span className="text-[#1565D8] font-bold font-mono">{user?.role}</span>. Review pre-auths, execute rule engines, raise queries, and enforce IRDAI SLA deadlines.
                    </p>
                </div>
            </div>

            {actionMsg && (
                <div className="p-4 rounded-lg bg-[#E7F7EE] border border-[#BBE7CB] text-emerald-400 text-sm">
                    ✓ {actionMsg}
                </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Queue List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[#6B7A94] uppercase tracking-wider">Claims Processing Queue ({claims.length})</h2>
                        <button onClick={fetchClaimsQueue} className="text-xs text-[#1565D8] hover:underline">Refresh</button>
                    </div>

                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                        {claims.map((c) => {
                            const sla = getSlaRemaining(c);
                            return (
                                <div
                                    key={c._id}
                                    onClick={() => setSelectedClaim(c)}
                                    className={`p-4 glass-card cursor-pointer transition-all ${selectedClaim?._id === c._id ? 'border-indigo-500 bg-indigo-950/20' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-[#1A2130] font-mono text-sm">{c.claimNumber}</span>
                                        <span className="badge badge-primary text-[10px]">{c.claimType}</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs font-semibold text-[#1A2130]">{c.status}</span>
                                        <SlaBadge status={sla.status} remainingMinutes={sla.remaining} isPaused={sla.isPaused} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Active Inspection & Action Panel */}
                {selectedClaim ? (
                    <div className="lg:col-span-8 space-y-6">
                        {/* Top Control Header */}
                        <div className="glass-panel p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0ECF8] pb-4">
                                <div>
                                    <div className="text-xs text-[#6B7A94] font-mono">Claim Reference: {selectedClaim.claimNumber}</div>
                                    <h2 className="text-xl font-bold text-white mt-0.5">{selectedClaim.procedureDetails?.procedureType || 'Eye Procedure'}</h2>
                                </div>
                                <div>
                                    <SlaBadge {...getSlaRemaining(selectedClaim)} />
                                </div>
                            </div>

                            {/* Action Buttons Toolbar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleAdjudicate}
                                    className="btn-primary py-2 px-4 text-xs font-bold"
                                >
                                    <Play className="w-3.5 h-3.5" />
                                    Run Step 1 Adjudication Engine
                                </button>

                                {selectedClaim.status === 'PRE_AUTH_SUBMITTED' && (
                                    <button
                                        onClick={() => handleTransition('IN_REVIEW', 'START_REVIEW', 'Started medical review')}
                                        className="btn-secondary py-2 px-4 text-xs"
                                    >
                                        Move to In-Review
                                    </button>
                                )}

                                {['IN_REVIEW', 'PRE_AUTH_SUBMITTED'].includes(selectedClaim.status) && (
                                    <button
                                        onClick={() => handleTransition('APPROVED', 'APPROVE_CLAIM', 'Pre-auth approved')}
                                        className="btn-success py-2 px-4 text-xs"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Approve Claim
                                    </button>
                                )}

                                {['IN_REVIEW', 'PRE_AUTH_SUBMITTED'].includes(selectedClaim.status) && (
                                    <button
                                        onClick={() => handleTransition('REJECTED', 'REJECT_CLAIM', 'Claim rejected')}
                                        className="btn-danger py-2 px-4 text-xs"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Reject Claim
                                    </button>
                                )}

                                {selectedClaim.status === 'APPROVED' && (
                                    <button
                                        onClick={() => handleTransition('SETTLED', 'SETTLE_CLAIM', 'Final settlement processed')}
                                        className="btn-success py-2 px-4 text-xs"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        Process Final Settlement
                                    </button>
                                )}
                            </div>

                            {/* Raise Query Drawer */}
                            {['IN_REVIEW', 'PRE_AUTH_SUBMITTED'].includes(selectedClaim.status) && (
                                <div className="p-4 rounded-xl bg-white/80 border border-[#E0ECF8] space-y-3">
                                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" />
                                        Raise Document Query to Hospital / Patient (Pauses SLA Clock)
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Specify required document (e.g. Missing IOL Barcode Sticker)"
                                            value={queryNote}
                                            onChange={(e) => setQueryNote(e.target.value)}
                                            className="flex-1"
                                        />
                                        <button
                                            onClick={() => handleTransition('QUERY_RAISED', 'RAISE_QUERY', 'Missing documents requested')}
                                            className="btn-warning py-2 px-4 text-xs shrink-0"
                                        >
                                            Raise Query & Pause Clock
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Adjudication Results Breakdown */}
                        <div className="glass-panel p-6 space-y-6">
                            <h3 className="text-base font-bold text-white border-b border-[#E0ECF8] pb-3 flex items-center justify-between">
                                <span>Adjudication Rules Output</span>
                                {selectedClaim.adjudicationResult && (
                                    <span className="badge badge-success">Engine Executed</span>
                                )}
                            </h3>

                            {selectedClaim.adjudicationResult ? (
                                <>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-3 glass-card">
                                            <div className="text-xs text-[#6B7A94]">Total Billed</div>
                                            <div className="text-lg font-bold text-[#1A2130] mt-1">₹{selectedClaim.adjudicationResult.totalBilled?.toLocaleString()}</div>
                                        </div>
                                        <div className="p-3 glass-card bg-emerald-950/20 border-[#BBE7CB]">
                                            <div className="text-xs text-emerald-400 font-semibold">Approved Payable</div>
                                            <div className="text-xl font-extrabold text-emerald-400 mt-1">₹{selectedClaim.adjudicationResult.approvedAmount?.toLocaleString()}</div>
                                        </div>
                                        <div className="p-3 glass-card bg-red-950/20 border-[#F5C2C2]">
                                            <div className="text-xs text-red-400 font-semibold">Total Deductions</div>
                                            <div className="text-xl font-extrabold text-red-400 mt-1">₹{selectedClaim.adjudicationResult.totalDeductions?.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <ClauseTable deductions={selectedClaim.adjudicationResult.itemizedDeductions} />
                                </>
                            ) : (
                                <div className="p-6 text-center text-[#6B7A94] text-sm">
                                    Click "Run Step 1 Adjudication Engine" above to compute rule deductions.
                                </div>
                            )}
                        </div>

                        {/* Audit Logs */}
                        <div className="glass-panel p-6 space-y-4">
                            <h3 className="text-sm font-bold text-[#1A2130] border-b border-[#E0ECF8] pb-2">
                                Append-Only Audit History ({auditLogs.length} Events)
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {auditLogs.map((log, idx) => (
                                    <div key={idx} className="p-2.5 glass-card flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-semibold text-[#1565D8]">{log.fromState} ➔ {log.toState}</span>
                                            <span className="text-[#6B7A94] ml-2">({log.action})</span>
                                            {log.notes && <div className="text-[#6B7A94] italic text-[11px]">{log.notes}</div>}
                                        </div>
                                        <div className="text-right">
                                            <span className="badge badge-info">{log.actorRole}</span>
                                            <div className="text-[10px] text-[#6B7A94] font-mono mt-0.5">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-8 glass-panel p-12 text-center text-[#6B7A94]">
                        Select a claim from the queue to process.
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsurerDashboard;
