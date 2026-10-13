import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter } from 'lucide-react';
import api from '../api/client';
import ClauseTable from '../components/ClauseTable';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLES = {
    IN_REVIEW: 'bg-[#EBF4FD] text-[#1565D8]',
    QUERY_RAISED: 'bg-[#FEF3E2] text-[#B45309]',
    QUERY_RESPONDED: 'bg-[#FEF3E2] text-[#B45309]',
    APPROVED: 'bg-[#E7F7EE] text-[#15803D]',
    SETTLED: 'bg-[#E6F6F4] text-[#0D9488]',
    REJECTED: 'bg-[#FDECEC] text-[#B91C1C]',
    DRAFT: 'bg-[#F1F3F7] text-[#6B7A94]',
    PRE_AUTH_SUBMITTED: 'bg-[#EBF4FD] text-[#1565D8]',
};

const StatusChip = ({ status }) => (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status] || 'bg-[#F1F3F7] text-[#6B7A94]'}`}>
        {String(status || '').replace(/_/g, ' ')}
    </span>
);

/** ClaimsPage — full claims list, scoped by the API to the caller's own claims. */
export default function ClaimsPage() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('ALL');
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        api.get('/claims?limit=100')
            .then((r) => setClaims(r.data.claims || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const visible = status === 'ALL' ? claims : claims.filter((c) => c.status === status);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7A94]">
                    <Filter className="w-3.5 h-3.5" /> Filter
                </span>
                {['ALL', 'PRE_AUTH_SUBMITTED', 'IN_REVIEW', 'QUERY_RAISED', 'APPROVED', 'SETTLED', 'REJECTED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={[
                            'h-9 px-3 rounded-lg text-xs font-semibold border transition-colors',
                            status === s
                                ? 'bg-[#EBF4FD] text-[#1565D8] border-[#1565D8]'
                                : 'bg-white text-[#6B7A94] border-[#E0ECF8] hover:text-[#1565D8]',
                        ].join(' ')}
                    >
                        {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
                    </button>
                ))}
                <span className="ml-auto text-xs text-[#6B7A94]">
                    {visible.length} of {claims.length} claims
                </span>
            </div>

            <div className="rounded-xl bg-white border border-[#E0ECF8] overflow-hidden"
                 style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                {loading ? (
                    <p className="p-6 text-sm text-[#6B7A94]">Loading claims…</p>
                ) : visible.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm font-semibold text-[#1A2130]">No claims to show</p>
                        <p className="text-xs text-[#6B7A94] mt-1">
                            Claims are visible once they are raised against one of your policies.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7FAFE] text-[#6B7A94] border-b border-[#E0ECF8]">
                            <tr>
                                <th className="px-4 py-3">Claim No.</th>
                                <th className="px-4 py-3">Policy</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Billed</th>
                                <th className="px-4 py-3">Approved</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((c) => (
                                <React.Fragment key={c._id}>
                                    <tr className="border-b border-[#F4F8FD] hover:bg-[#F7FAFE]">
                                        <td className="px-4 py-3 font-mono text-[11px] text-[#1565D8] font-semibold">{c.claimNumber}</td>
                                        <td className="px-4 py-3 text-[#1A2130]">
                                            {c.policyId?.memberName || '—'}
                                            <div className="font-mono text-[10px] text-[#6B7A94]">{c.policyId?.policyNumber}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#6B7A94]">{c.claimType}</td>
                                        <td className="px-4 py-3 if-num text-[#1A2130]">{inr(c.adjudicationResult?.totalBilled)}</td>
                                        <td className="px-4 py-3 if-num font-semibold text-[#15803D]">{inr(c.adjudicationResult?.approvedAmount)}</td>
                                        <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setOpenId(openId === c._id ? null : c._id)}
                                                className="text-[#1565D8] hover:text-[#1259BE]"
                                                aria-label="Toggle deductions"
                                            >
                                                <ChevronRight className={`w-4 h-4 transition-transform ${openId === c._id ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                    </tr>
                                    {openId === c._id && (
                                        <tr className="border-b border-[#F4F8FD] bg-[#FBFDFF]">
                                            <td colSpan="7" className="px-4 py-3">
                                                <ClauseTable deductions={c.adjudicationResult?.itemizedDeductions || []} claimId={c._id} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="text-[11px] text-[#6B7A94]">
                Expand a claim to see clause-level deductions and file a dispute from any row.
            </p>
        </div>
    );
}
