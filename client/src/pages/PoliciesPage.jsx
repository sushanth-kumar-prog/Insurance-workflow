import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../api/client';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLES = {
    ACTIVE: 'bg-[#E7F7EE] text-[#15803D]',
    LAPSED: 'bg-[#FDECEC] text-[#B91C1C]',
    EXPIRED: 'bg-[#F1F3F7] text-[#6B7A94]',
};

const Card = ({ className = '', children }) => (
    <div className={`rounded-xl bg-white border border-[#E0ECF8] ${className}`}
         style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
        {children}
    </div>
);

/**
 * PoliciesPage — reads GET /api/policies, which already scopes non-staff
 * callers. Staff may create new policies from here.
 */
export default function PoliciesPage() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    const load = () => {
        setLoading(true);
        api.get('/policies')
            .then((r) => setPolicies(r.data.policies || []))
            .catch(() => setPolicies([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const filtered = policies.filter((p) =>
        !query ||
        p.policyNumber?.toLowerCase().includes(query.toLowerCase()) ||
        p.memberName?.toLowerCase().includes(query.toLowerCase())
    );

    const totalCover = policies.reduce((s, p) => s + (p.sumInsuredTotal || p.sumInsuredBalance || 0), 0);
    const totalBalance = policies.reduce((s, p) => s + (p.sumInsuredBalance || 0), 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { l: 'Policies', v: policies.length },
                    { l: 'Total cover', v: inr(totalCover) },
                    { l: 'Available balance', v: inr(totalBalance) },
                ].map((s) => (
                    <Card key={s.l} className="p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7A94]">{s.l}</p>
                        <p className="if-num text-2xl font-extrabold text-[#1A2130] mt-1">{s.v}</p>
                    </Card>
                ))}
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A94] pointer-events-none" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search policy number or member"
                    aria-label="Search policies"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#E0ECF8] text-sm
                               placeholder:text-[#6B7A94] focus:border-[#1565D8] outline-none"
                />
            </div>

            <Card className="overflow-hidden">
                {loading ? (
                    <p className="p-6 text-sm text-[#6B7A94]">Loading policies…</p>
                ) : filtered.length === 0 ? (
                    <p className="p-8 text-center text-sm text-[#6B7A94]">
                        No policies found. Seeded policies appear here, or create one via POST /api/policies.
                    </p>
                ) : (
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7FAFE] text-[#6B7A94] border-b border-[#E0ECF8]">
                            <tr>
                                <th className="px-4 py-3">Policy No.</th>
                                <th className="px-4 py-3">Member</th>
                                <th className="px-4 py-3">Inception</th>
                                <th className="px-4 py-3">Waiting</th>
                                <th className="px-4 py-3">IOL cap</th>
                                <th className="px-4 py-3">Balance</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p._id} className="border-b border-[#F4F8FD] hover:bg-[#FBFDFF]">
                                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#1565D8]">{p.policyNumber}</td>
                                    <td className="px-4 py-3 text-[#1A2130]">
                                        {p.memberName}
                                        <div className="text-[10px] text-[#6B7A94]">{p.memberId}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[#6B7A94] if-num">
                                        {p.policyInceptionDate ? new Date(p.policyInceptionDate).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-[#6B7A94] if-num">{p.waitingPeriodMonths}m</td>
                                    <td className="px-4 py-3 if-num text-[#1A2130]">{inr(p.iolTariffCap)}</td>
                                    <td className="px-4 py-3 if-num text-[#1A2130]">{inr(p.sumInsuredBalance)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[p.status] || 'bg-[#F1F3F7] text-[#6B7A94]'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
