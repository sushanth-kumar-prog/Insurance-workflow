import React, { useState, useEffect } from 'react';
import api from '../api/client';
import ClauseTable from '../components/ClauseTable';
import SlaBreachPulse from '../components/SlaBreachPulse';
import UploadSection from '../components/UploadSection';
import OutOfPocketExplorer from '../components/OutOfPocketExplorer';
import {
    FileText,
    CheckCircle,
    Clock,
    Send,
    Plus,
    AlertCircle,
    FileCheck
} from 'lucide-react';

const ClaimantPortal = () => {
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [sla, setSla] = useState(null);
    const [loading, setLoading] = useState(true);
    const [queryResponseNote, setQueryResponseNote] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    const fetchClaims = async () => {
        try {
            const res = await api.get('/claims/my-claims');
            setClaims(res.data.claims || []);
            if (res.data.claims && res.data.claims.length > 0) {
                setSelectedClaim(res.data.claims[0]);
            }
        } catch (err) {
            // Fallback for demo mock
        } finally {
            setLoading(false);
        }
    };

    const fetchAudit = async (claimId) => {
        try {
            const res = await api.get(`/claims/${claimId}/audit-trail`);
            setAuditLogs(res.data.logs || []);
            // The server computes the SLA so the client can count down locally.
            setSla(res.data.sla || null);
        } catch (err) {
            setAuditLogs([]);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    useEffect(() => {
        if (selectedClaim) {
            fetchAudit(selectedClaim._id);
        }
    }, [selectedClaim]);

    const handleRespondQuery = async () => {
        if (!selectedClaim) return;
        try {
            await api.post(`/claims/${selectedClaim._id}/transition`, {
                targetState: 'QUERY_RESPONDED',
                notes: queryResponseNote || 'Document uploaded by claimant',
                action: 'RESPOND_QUERY'
            });
            setActionSuccess('Query response submitted successfully! SLA clock resumed.');
            setQueryResponseNote('');
            fetchClaims();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to submit query response');
        }
    };

    const steps = [
        { key: 'DRAFT', label: 'Draft Created' },
        { key: 'PRE_AUTH_SUBMITTED', label: 'Pre-Auth Submitted' },
        { key: 'IN_REVIEW', label: 'In Review' },
        { key: 'APPROVED', label: 'Approved' },
        { key: 'SETTLED', label: 'Discharged & Settled' }
    ];

    const getStepStatus = (stepKey, currentStatus) => {
        const order = ['DRAFT', 'PRE_AUTH_SUBMITTED', 'IN_REVIEW', 'QUERY_RAISED', 'QUERY_RESPONDED', 'APPROVED', 'SETTLED'];
        const currentIdx = order.indexOf(currentStatus);
        const stepIdx = order.indexOf(stepKey);

        if (currentStatus === stepKey) return 'active';
        if (currentIdx > stepIdx) return 'completed';
        return 'pending';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[#1565D8] font-semibold text-sm mb-1">
                        <FileText className="w-4 h-4" />
                        Patient & Claimant Transparency Dashboard
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">My Claims & Real-Time Tracker</h1>
                    <p className="text-[#6B7A94] text-sm mt-1">
                        Track statutory timelines, transparent clause deductions, and submit document query responses directly.
                    </p>
                </div>
            </div>

            {actionSuccess && (
                <div className="p-4 rounded-lg bg-[#E7F7EE] border border-[#BBE7CB] text-emerald-400 text-sm flex items-center justify-between">
                    <span>✓ {actionSuccess}</span>
                    <button onClick={() => setActionSuccess('')} className="text-xs font-bold text-[#15803D]">Dismiss</button>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Claim Selection List */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-sm font-bold text-[#6B7A94] uppercase tracking-wider">Active Claim Files ({claims.length})</h2>

                    {claims.length === 0 ? (
                        <div className="glass-panel p-6 text-center text-[#6B7A94] text-sm">
                            No active claims found. Create or submit a claim via Hospital Desk or Simulator.
                        </div>
                    ) : (
                        claims.map((c) => (
                            <div
                                key={c._id}
                                onClick={() => setSelectedClaim(c)}
                                className={`p-4 glass-card cursor-pointer transition-all ${selectedClaim?._id === c._id ? 'border-indigo-500 bg-indigo-950/20' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-[#1A2130] font-mono text-sm">{c.claimNumber}</span>
                                    <span className={`badge ${c.status === 'APPROVED' ? 'badge-success' :
                                            c.status === 'QUERY_RAISED' ? 'badge-warning' : 'badge-primary'
                                        }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="text-xs text-[#6B7A94]">Type: {c.claimType}</div>
                                <div className="text-xs text-[#1565D8] mt-2 font-medium">
                                    Procedure: {c.procedureDetails?.procedureType || 'Eye Surgery'}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Timeline & Detailed Breakdown */}
                {selectedClaim ? (
                    <div className="lg:col-span-8 space-y-6">
                        {/* Visual Step Timeline */}
                        <div className="glass-panel p-6 space-y-6">
                            <h2 className="text-base font-bold text-white border-b border-[#E0ECF8] pb-3 flex items-center justify-between">
                                <span>Claim Lifecycle Timeline</span>
                                <span className="text-xs text-[#6B7A94] font-mono">Claim ID: {selectedClaim.claimNumber}</span>
                            </h2>

                            <div className="flex justify-between items-center py-4 px-2">
                                {steps.map((s, idx) => {
                                    const statusClass = getStepStatus(s.key, selectedClaim.status);
                                    return (
                                        <div key={idx} className={`timeline-step ${statusClass}`}>
                                            <div className="timeline-icon">
                                                {statusClass === 'completed' ? (
                                                    <CheckCircle className="w-5 h-5" />
                                                ) : statusClass === 'active' ? (
                                                    <Clock className="w-5 h-5" />
                                                ) : (
                                                    <span className="text-xs font-bold">{idx + 1}</span>
                                                )}
                                            </div>
                                            <div className="text-xs font-semibold text-[#1A2130] mt-1">{s.label}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {sla && (
                                <div className="flex justify-center">
                                    <SlaBreachPulse
                                        remainingMinutes={sla.remainingMinutes}
                                        paused={sla.isPaused}
                                        slaType="PRE_AUTH"
                                    />
                                </div>
                            )}

                            <UploadSection
                                claimId={selectedClaim._id}
                                onUploaded={() => fetchAudit(selectedClaim._id)}
                            />

                            {selectedClaim.status === 'QUERY_RAISED' && (
                                <div className="p-4 rounded-xl bg-[#FEF3E2] border border-[#F5D9AE] space-y-3">
                                    <div className="flex items-center gap-2 font-bold text-[#B45309] text-sm">
                                        <AlertCircle className="w-4 h-4 text-amber-400" />
                                        Query Raised by Medical Officer — Response Required
                                    </div>
                                    <p className="text-xs text-[#1A2130]">
                                        SLA Clock is currently <strong>PAUSED</strong>. Please upload/submit the missing biometry or IOL sticker document to resume evaluation.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add document reference note (e.g. Biometry Report PDF attached)"
                                            value={queryResponseNote}
                                            onChange={(e) => setQueryResponseNote(e.target.value)}
                                            className="flex-1"
                                        />
                                        <button onClick={handleRespondQuery} className="btn-warning shrink-0 text-xs">
                                            <Send className="w-3.5 h-3.5" />
                                            Submit Response
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Financial Summary & Itemized Deductions */}
                        <div className="glass-panel p-6 space-y-6">
                            <h2 className="text-base font-bold text-white border-b border-[#E0ECF8] pb-3">
                                Transparent Itemised Adjudication Breakdown
                            </h2>

                            {selectedClaim.adjudicationResult ? (
                                <>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-3 glass-card">
                                            <div className="text-xs text-[#6B7A94]">Total Billed</div>
                                            <div className="text-lg font-bold text-[#1A2130] mt-1">
                                                ₹{selectedClaim.adjudicationResult.totalBilled?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-3 glass-card bg-emerald-950/20 border-[#BBE7CB]">
                                            <div className="text-xs text-emerald-400 font-semibold">Approved Payable</div>
                                            <div className="text-xl font-extrabold text-emerald-400 mt-1">
                                                ₹{selectedClaim.adjudicationResult.approvedAmount?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-3 glass-card bg-red-950/20 border-[#F5C2C2]">
                                            <div className="text-xs text-red-400 font-semibold">Total Deductions</div>
                                            <div className="text-xl font-extrabold text-red-400 mt-1">
                                                ₹{selectedClaim.adjudicationResult.totalDeductions?.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <ClauseTable
                                        deductions={selectedClaim.adjudicationResult.itemizedDeductions}
                                        claimId={selectedClaim._id}
                                        onDisputeFiled={() => fetchAudit(selectedClaim._id)}
                                    />
                                </>
                            ) : (
                                <div className="p-6 text-center text-[#6B7A94] text-sm">
                                    Adjudication has not been executed on this claim draft yet.
                                </div>
                            )}
                        </div>

                        {/* Cost Explorer — driven by the live engine */}
                        {selectedClaim.policyId && (
                            <div className="glass-panel p-6 space-y-4">
                                <OutOfPocketExplorer
                                    policyId={selectedClaim.policyId._id || selectedClaim.policyId}
                                    policyDetails={selectedClaim.policyId.sumInsuredBalance != null ? {
                                        sumInsuredBalance: selectedClaim.policyId.sumInsuredBalance,
                                        waitingPeriodMonths: selectedClaim.policyId.waitingPeriodMonths ?? 24,
                                        elapsedMonths: 36,
                                        iolTariffCap: selectedClaim.policyId.iolTariffCap ?? 15000,
                                        roomCap: selectedClaim.policyId.roomCap ?? 5000,
                                        procedureSublimits: {}
                                    } : undefined}
                                />
                            </div>
                        )}

                        {/* Audit Trail Timeline */}
                        <div className="glass-panel p-6 space-y-4">
                            <h3 className="text-sm font-bold text-[#1A2130] border-b border-[#E0ECF8] pb-2">
                                Immutable Append-Only Audit History ({auditLogs.length} Events)
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {auditLogs.map((log, idx) => (
                                    <div key={idx} className="p-2.5 glass-card flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-semibold text-[#1565D8]">{log.fromState} ➔ {log.toState}</span>
                                            <span className="text-[#6B7A94] ml-2">({log.action})</span>
                                            {log.notes && <div className="text-[#6B7A94] italic text-[11px] mt-0.5">{log.notes}</div>}
                                        </div>
                                        <div className="text-right">
                                            <div className="badge badge-info">{log.actorRole}</div>
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
                    <div className="lg:col-span-8 glass-panel p-12 text-center text-[#6B7A94] flex flex-col items-center justify-center">
                        <FileCheck className="w-12 h-12 text-slate-700 mb-2" />
                        Select a claim from the left sidebar to inspect details.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClaimantPortal;
