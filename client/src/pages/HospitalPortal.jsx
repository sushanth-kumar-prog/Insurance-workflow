import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
    Building2,
    Plus,
    Send,
    FileCheck,
    AlertCircle,
    CheckCircle2,
    ListChecks
} from 'lucide-react';

const HospitalPortal = () => {
    const [claims, setClaims] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState('');

    // New Claim Form
    const [claimNumber, setClaimNumber] = useState(`CLM-HOSP-${Math.floor(1000 + Math.random() * 9000)}`);
    const [claimType, setClaimType] = useState('CASHLESS');
    const [procedureType, setProcedureType] = useState('Phacoemulsification Cataract Surgery');
    const [eyeSide, setEyeSide] = useState('LEFT');
    const [iolCost, setIolCost] = useState(18000);
    const [hasBiometry, setHasBiometry] = useState(true);
    const [hasIolSticker, setHasIolSticker] = useState(true);

    const [billItems, setBillItems] = useState([
        { itemCode: 'ROOM-AC', category: 'ROOM_RENT', description: 'Single AC Deluxe Room', billedAmount: 6000 },
        { itemCode: 'IOL-MONO', category: 'IOL', description: 'Monofocal Foldable IOL Lens', billedAmount: 18000 },
        { itemCode: 'CATARACT-SURG', category: 'PROCEDURE', description: 'Cataract Surgery Package', billedAmount: 35000 },
        { itemCode: 'ADMIN-KIT', category: 'ADMIN_FEE', description: 'Hospital Admission Kit', billedAmount: 1500 }
    ]);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const fetchHospitalData = async () => {
        try {
            const res = await api.get('/claims/all');
            setClaims(res.data.claims || []);
        } catch (err) {
            // Fallback
        }
    };

    useEffect(() => {
        fetchHospitalData();
    }, []);

    const handleCreateClaim = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        try {
            // 1. Ensure policy exists or create temporary policy
            const policyRes = await api.post('/claims/seed-policy', {
                policyNumber: `POL-HOSP-${Date.now().toString().slice(-4)}`,
                memberName: 'Patient Sushanth',
                memberId: `MEM-${Math.floor(100 + Math.random() * 900)}`,
                sumInsuredBalance: 100000,
                policyInceptionDate: '2021-01-01',
                waitingPeriodMonths: 24
            });

            const policyId = policyRes.data.policy._id;

            // 2. Submit Claim
            const claimRes = await api.post('/claims', {
                claimNumber,
                policyId,
                claimType,
                procedureDetails: {
                    procedureType,
                    eyeSide,
                    iolCost: parseFloat(iolCost),
                    admissionDate: new Date().toISOString()
                },
                billItems,
                documents: [
                    ...(hasBiometry ? ['BIOMETRY_REPORT'] : []),
                    ...(hasIolSticker ? ['IOL_STICKER'] : [])
                ]
            });

            // 3. Immediately transition from DRAFT to PRE_AUTH_SUBMITTED for cashless
            await api.post(`/claims/${claimRes.data.claim._id}/transition`, {
                targetState: 'PRE_AUTH_SUBMITTED',
                notes: 'Submitted by Hospital Desk Desk',
                action: 'SUBMIT_PRE_AUTH'
            });

            setMsg(`Pre-Auth Claim ${claimNumber} submitted successfully! IRDAI 1-Hour SLA Clock Started.`);
            setClaimNumber(`CLM-HOSP-${Math.floor(1000 + Math.random() * 9000)}`);
            fetchHospitalData();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed to submit pre-auth claim');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
                        <Building2 className="w-4 h-4" />
                        Hospital Provider Cashless Desk Portal
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">Cashless Pre-Auth & Submission Desk</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Submit pre-authorisations with procedural checklists and track live query notifications within IRDAI 1-hour statutory windows.
                    </p>
                </div>
            </div>

            {msg && (
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-sm">
                    ✓ {msg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: New Cashless Pre-Auth Submission */}
                <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleCreateClaim} className="glass-panel p-6 space-y-6">
                        <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-400" />
                            New Cashless Pre-Authorisation Submission
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Claim Reference Number</label>
                                <input
                                    type="text"
                                    value={claimNumber}
                                    onChange={(e) => setClaimNumber(e.target.value)}
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Claim Type</label>
                                <select value={claimType} onChange={(e) => setClaimType(e.target.value)}>
                                    <option value="CASHLESS">CASHLESS (Statutory 1-Hr Mandate)</option>
                                    <option value="REIMBURSEMENT">REIMBURSEMENT</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Procedure Type</label>
                                <input
                                    type="text"
                                    value={procedureType}
                                    onChange={(e) => setProcedureType(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Eye Side</label>
                                <select value={eyeSide} onChange={(e) => setEyeSide(e.target.value)}>
                                    <option value="LEFT">Left Eye</option>
                                    <option value="RIGHT">Right Eye</option>
                                </select>
                            </div>
                        </div>

                        {/* Procedural Checklist */}
                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <ListChecks className="w-4 h-4 text-indigo-400" />
                                Procedural Mandatory Document Checklist
                            </div>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasBiometry}
                                        onChange={(e) => setHasBiometry(e.target.checked)}
                                        className="w-4 h-4 accent-indigo-600 rounded"
                                    />
                                    Biometry Report
                                </label>

                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasIolSticker}
                                        onChange={(e) => setHasIolSticker(e.target.checked)}
                                        className="w-4 h-4 accent-indigo-600 rounded"
                                    />
                                    IOL Sticker & Barcode
                                </label>
                            </div>
                        </div>

                        {/* Bill Summary */}
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estimated Bill Items ({billItems.length})</div>
                            {billItems.map((item, idx) => (
                                <div key={idx} className="p-2.5 glass-card flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-semibold text-slate-200">{item.description}</span>
                                        <span className="text-slate-500 font-mono ml-2">({item.category})</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-300">₹{item.billedAmount?.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-3">
                            <Send className="w-4 h-4" />
                            {loading ? 'Submitting Pre-Auth...' : 'Submit Pre-Auth Claim to Insurer Queue'}
                        </button>
                    </form>
                </div>

                {/* Right: Hospital Active Submissions Board */}
                <div className="lg:col-span-5 space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Hospital Submissions ({claims.length})</h2>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {claims.map((c) => (
                            <div key={c._id} className="p-4 glass-card space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-bold text-slate-200 font-mono text-sm">{c.claimNumber}</span>
                                        <div className="text-xs text-slate-400 mt-0.5">{c.procedureDetails?.procedureType}</div>
                                    </div>
                                    <span className={`badge ${c.status === 'APPROVED' ? 'badge-success' :
                                            c.status === 'QUERY_RAISED' ? 'badge-warning' : 'badge-primary'
                                        }`}>
                                        {c.status}
                                    </span>
                                </div>

                                {c.status === 'QUERY_RAISED' && (
                                    <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>Document Query Raised by Verifier — Timer Paused.</span>
                                    </div>
                                )}

                                {c.adjudicationResult && (
                                    <div className="flex justify-between items-center text-xs text-slate-300 pt-2 border-t border-slate-800">
                                        <span>Approved: <strong className="text-emerald-400">₹{c.adjudicationResult.approvedAmount?.toLocaleString()}</strong></span>
                                        <span>Deductions: <strong className="text-red-400">₹{c.adjudicationResult.totalDeductions?.toLocaleString()}</strong></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalPortal;
