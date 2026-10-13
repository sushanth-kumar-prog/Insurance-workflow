import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';
import api from '../api/client';
import SlaBreachPulse from '../components/SlaBreachPulse';

const STATUS_STYLES = {
    IN_REVIEW: 'bg-[#EBF4FD] text-[#1565D8]',
    QUERY_RAISED: 'bg-[#FEF3E2] text-[#B45309]',
    QUERY_RESPONDED: 'bg-[#FEF3E2] text-[#B45309]',
    APPROVED: 'bg-[#E7F7EE] text-[#15803D]',
    SETTLED: 'bg-[#E6F6F4] text-[#0D9488]',
    REJECTED: 'bg-[#FDECEC] text-[#B91C1C]',
    PRE_AUTH_SUBMITTED: 'bg-[#EBF4FD] text-[#1565D8]',
    DRAFT: 'bg-[#F1F3F7] text-[#6B7A94]',
};

const StatusChip = ({ status }) => (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status] || 'bg-[#F1F3F7] text-[#6B7A94]'}`}>
        {String(status || '').replace(/_/g, ' ')}
    </span>
);

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Card = ({ className = '', children }) => (
    <div className={`rounded-xl bg-white border border-[#E0ECF8] ${className}`}
         style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
        {children}
    </div>
);

/**
 * PreAuthPage — pre-authorisation queue with the live SLA clock per claim.
 * The SLA payload comes from the audit-trail endpoint, not a hardcoded timer.
 */
export default function PreAuthPage() {
    const [claims, setClaims] = useState([]);
    const [slaByClaim, setSlaByClaim] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/claims?limit=100')
            .then((r) => {
                const list = r.data.claims || [];
                setClaims(list);
                // Fetch SLA for the ones still on the pre-auth clock.
                const live = list.filter((c) => ['PRE_AUTH_SUBMITTED', 'IN_REVIEW', 'QUERY_RAISED', 'QUERY_RESPONDED'].includes(c.status));
                return Promise.all(
                    live.map((c) =>
                        api.get(`/claims/${c._id}/audit-trail`)
                            .then((r) => [c._id, r.data.sla])
                            .catch(() => [c._id, null])
                    )
                );
            })
            .then((pairs) => {
                setSlaByClaim(Object.fromEntries(pairs.filter(([, sla]) => sla)));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const queue = claims.filter((c) => c.status !== 'DRAFT');

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { l: 'Awaiting submission', v: claims.filter((c) => c.status === 'PRE_AUTH_SUBMITTED').length },
                    { l: 'In review', v: claims.filter((c) => c.status === 'IN_REVIEW').length },
                    { l: 'Query outstanding', v: claims.filter((c) => c.status === 'QUERY_RAISED').length },
                ].map((s) => (
                    <Card key={s.l} className="p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7A94]">{s.l}</p>
                        <p className="if-num text-2xl font-extrabold text-[#1A2130] mt-1">{s.v}</p>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden">
                {loading ? (
                    <p className="p-6 text-sm text-[#6B7A94]">Loading pre-authorisation queue…</p>
                ) : queue.length === 0 ? (
                    <div className="p-10 text-center">
                        <ShieldCheck className="w-8 h-8 text-[#1565D8] mx-auto" />
                        <p className="text-sm font-semibold text-[#1A2130] mt-2">Nothing awaiting pre-authorisation</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-[#F4F8FD]">
                        {queue.map((c) => (
                            <li key={c._id} className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-[#FBFDFF]">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-[#1A2130] font-mono text-xs">{c.claimNumber}</p>
                                    <p className="text-[11px] text-[#6B7A94]">
                                        {c.policyId?.memberName} &middot; {c.claimType} &middot; billed {inr(c.adjudicationResult?.totalBilled)}
                                    </p>
                                </div>
                                {slaByClaim[c._id] && (
                                    <SlaBreachPulse
                                        remainingMinutes={slaByClaim[c._id].remainingMinutes}
                                        paused={slaByClaim[c._id].isPaused}
                                        slaType="PRE_AUTH"
                                    />
                                )}
                                <StatusChip status={c.status} />
                                <Link
                                    to="/claims"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1565D8] hover:underline"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Open
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <p className="text-[11px] text-[#6B7A94]">
                The clock pauses automatically while a document query is outstanding, per the IRDAI mandate.
            </p>
        </div>
    );
}
