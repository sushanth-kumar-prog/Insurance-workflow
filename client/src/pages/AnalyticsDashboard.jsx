import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
    BarChart3,
    Clock,
    AlertTriangle,
    CheckCircle2,
    FileCode2,
    Copy,
    Check,
    TrendingUp,
    DollarSign
} from 'lucide-react';

const AnalyticsDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [claims, setClaims] = useState([]);
    const [selectedClaimId, setSelectedClaimId] = useState('');
    const [fhirData, setFhirData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/analytics/sla-summary');
            setMetrics(res.data.data);

            const claimsRes = await api.get('/claims/all');
            setClaims(claimsRes.data.claims || []);
            if (claimsRes.data.claims && claimsRes.data.claims.length > 0) {
                setSelectedClaimId(claimsRes.data.claims[0]._id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchFhirJson = async (claimId) => {
        if (!claimId) return;
        try {
            const res = await api.get(`/claims/${claimId}/fhir`);
            setFhirData(res.data);
        } catch (err) {
            setFhirData({ error: 'Failed to generate FHIR R4 payload' });
        }
    };

    useEffect(() => {
        if (selectedClaimId) {
            fetchFhirJson(selectedClaimId);
        }
    }, [selectedClaimId]);

    const handleCopyFhir = () => {
        if (!fhirData) return;
        navigator.clipboard.writeText(JSON.stringify(fhirData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
                        <BarChart3 className="w-4 h-4" />
                        Executive SLA & NHCX Interoperability Portal
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">Analytics & HL7 FHIR R4 Exporter</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Monitor IRDAI statutory turnaround time (TAT), breach rates, payout outflow metrics, and serialize claim payloads to standard FHIR R4 JSON.
                    </p>
                </div>
            </div>

            {/* KPI Cards Grid */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 glass-card space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Total Financial Outflow</span>
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-extrabold text-emerald-400">
                            ₹{metrics.totalOutflow?.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500">Approved claims payout</div>
                    </div>

                    <div className="p-5 glass-card space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Approval Ratio</span>
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-300">
                            {metrics.approvalRatio}%
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {metrics.approvedCount} Approved / {metrics.rejectedCount} Rejected
                        </div>
                    </div>

                    <div className="p-5 glass-card space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Total SLA Breaches</span>
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-2xl font-extrabold text-amber-400">
                            {metrics.totalBreaches}
                        </div>
                        <div className="text-[11px] text-slate-500">Exceeded 1-Hr / 3-Hr window</div>
                    </div>

                    <div className="p-5 glass-card space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Overall Breach %</span>
                            <Clock className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="text-2xl font-extrabold text-red-400">
                            {metrics.breachPercentage}%
                        </div>
                        <div className="text-[11px] text-slate-500">IRDAI compliance benchmark</div>
                    </div>
                </div>
            )}

            {/* FHIR R4 Serializer & Exporter Section */}
            <div className="glass-panel p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                        <FileCode2 className="w-5 h-5 text-indigo-400" />
                        <div>
                            <h2 className="text-base font-bold text-white">HL7 FHIR R4 JSON Serializer</h2>
                            <p className="text-xs text-slate-400">Export claims in National Health Claims Exchange (NHCX) JSON format</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                            value={selectedClaimId}
                            onChange={(e) => setSelectedClaimId(e.target.value)}
                            className="sm:w-64"
                        >
                            {claims.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.claimNumber} ({c.claimType})
                                </option>
                            ))}
                        </select>

                        <button onClick={handleCopyFhir} className="btn-secondary py-2 text-xs shrink-0">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Copy JSON'}
                        </button>
                    </div>
                </div>

                {/* Code Viewer */}
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 font-mono text-xs">
                    <div className="px-4 py-2 bg-slate-900 text-slate-400 text-[11px] flex justify-between border-b border-slate-800">
                        <span>resourceType: "Claim" (HL7 FHIR R4)</span>
                        <span>JSON</span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-indigo-300 max-h-96">
                        {fhirData ? JSON.stringify(fhirData, null, 2) : '// Select a claim to render FHIR R4 JSON payload'}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
