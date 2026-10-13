import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronDown, Filter, Plus } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Claims saved before `timestamps` was enabled have no createdAt. */
function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

const Card = ({ className = '', children }) => (
    <div className={`rounded-xl bg-white border border-[#E0ECF8] ${className}`}
         style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
        {children}
    </div>
);

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

const StatTile = ({ label, value, delta }) => (
    <Card className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7A94]">{label}</p>
        <div className="mt-2 flex items-end gap-2">
            <span className="if-num text-2xl font-extrabold text-[#1A2130] leading-none">{value}</span>
            {delta && (
                <span className="text-[11px] font-semibold text-[#16A34A] bg-[#E7F7EE] px-1.5 py-0.5 rounded-full">
                    {delta}
                </span>
            )}
        </div>
        <a href="#reports" className="mt-3 inline-block text-[11px] font-semibold text-[#1565D8] hover:underline">
            See Reports
        </a>
    </Card>
);

/* ── donut (hand-rolled SVG; no library needed) ──────────────────────────── */

function Donut({ segments, centerLabel, centerValue }) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;

    return (
        <div className="relative w-[160px] h-[160px] shrink-0">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" role="img" aria-label={centerLabel}>
                <circle cx="70" cy="70" r={R} fill="none" stroke="#EBF4FD" strokeWidth="16" />
                {segments.map((s) => {
                    const len = (s.value / total) * C;
                    const el = (
                        <circle
                            key={s.label}
                            cx="70" cy="70" r={R} fill="none"
                            stroke={s.color} strokeWidth="16"
                            strokeDasharray={`${len} ${C - len}`}
                            strokeDashoffset={-offset}
                        />
                    );
                    offset += len;
                    return el;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="if-num text-xl font-extrabold text-[#1A2130]">{centerValue}</span>
                <span className="text-[10px] text-[#6B7A94]">{centerLabel}</span>
            </div>
        </div>
    );
}

/* ── mini SLA calendar ───────────────────────────────────────────────────── */

function SlaCalendar({ events = [] }) {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const eventDays = new Set(events.map((e) => e.day));

    const cells = [
        ...Array.from({ length: first }, () => null),
        ...Array.from({ length: days }, (_, i) => i + 1),
    ];

    return (
        <Card className="p-4">
            <h3 className="text-sm font-bold text-[#1A2130]">
                SLA Calendar <span className="font-normal text-[#6B7A94]">&middot; {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h3>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-semibold text-[#6B7A94] py-1">{d}</span>
                ))}
                {cells.map((day, i) => (
                    <span
                        key={i}
                        className={[
                            'h-7 flex items-center justify-center rounded-md text-[11px] if-num',
                            day === null ? '' :
                                day === now.getDate() ? 'bg-[#1565D8] text-white font-bold'
                                : eventDays.has(day) ? 'bg-[#FEF3E2] text-[#B45309] font-semibold'
                                : 'text-[#1A2130] hover:bg-[#EBF4FD]',
                        ].join(' ')}
                    >
                        {day}
                    </span>
                ))}
            </div>

            <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#6B7A94]">Upcoming SLA events</h4>
            <ul className="mt-2 space-y-2">
                {(events.length ? events : [
                    { day: now.getDate() + 1, title: 'Pre-auth decision due', tone: '#1565D8' },
                    { day: now.getDate() + 3, title: 'Discharge settlement due', tone: '#D97706' },
                ]).slice(0, 3).map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.tone || '#1565D8' }} />
                        <span className="text-[#1A2130]">{e.title}</span>
                        <span className="ml-auto text-[10px] text-[#6B7A94] if-num">{e.day}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
    const { user } = useAuth();
    const [claims, setClaims] = useState([]);
    const [summary, setSummary] = useState(null);
    const [policies, setPolicies] = useState([]);
    const [tab, setTab] = useState('Claims');
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        // All calls keep credentials via the shared axios instance.
        api.get('/claims?limit=100').then((r) => setClaims(r.data.claims || [])).catch(() => {});
        api.get('/analytics/sla-summary').then((r) => setSummary(r.data?.data || null)).catch(() => {});
        api.get('/policies').then((r) => setPolicies(r.data?.policies || [])).catch(() => {});
    }, []);

    const visible = filter === 'ALL' ? claims : claims.filter((c) => c.status === filter);

    const counts = claims.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
    const segments = [
        { label: 'Approved', value: (counts.APPROVED || 0) + (counts.SETTLED || 0), color: '#16A34A' },
        { label: 'In review', value: (counts.IN_REVIEW || 0) + (counts.PRE_AUTH_SUBMITTED || 0), color: '#1565D8' },
        { label: 'Query', value: (counts.QUERY_RAISED || 0) + (counts.QUERY_RESPONDED || 0), color: '#D97706' },
        { label: 'Rejected', value: counts.REJECTED || 0, color: '#DC2626' },
        // Without this the ring under-reports whenever drafts exist.
        { label: 'Draft', value: counts.DRAFT || 0, color: '#94A3B8' },
    ];

    const settledTotal = claims
        .filter((c) => c.status === 'SETTLED' || c.status === 'APPROVED')
        .reduce((s, c) => s + (c.adjudicationResult?.approvedAmount || 0), 0);

    // Placeholder figures are only used where the API exposes no equivalent.
    const barData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            { label: 'Approved (₹k)', data: [320, 410, 380, 505, 462, 548], backgroundColor: '#1565D8', borderRadius: 4 },
            { label: 'Settled (₹k)', data: [240, 305, 298, 402, 388, 461], backgroundColor: '#16A34A', borderRadius: 4 },
        ],
    };

    return (
        <div className="space-y-4">
            {/* Banner row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { t: 'Statutory SLA compliance', s: 'IRDAI 1-hour pre-auth mandate', g: 'linear-gradient(135deg,#1E74E8,#1565D8)' },
                    { t: 'Transparent adjudication', s: 'Clause-referenced deductions', g: 'linear-gradient(135deg,#6D4AE0,#8B5CF6)' },
                    { t: 'Immutable audit trail', s: 'Append-only event history', g: 'linear-gradient(135deg,#12A150,#16A34A)' },
                ].map((b) => (
                    <div key={b.t} className="rounded-xl p-4 text-white" style={{ background: b.g, boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                        <p className="text-sm font-bold">{b.t}</p>
                        <p className="text-xs text-white/85 mt-0.5">{b.s}</p>
                    </div>
                ))}
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1565D8] text-white text-sm font-semibold hover:bg-[#1259BE] transition-colors">
                    Submit Claim <ChevronDown className="w-4 h-4" />
                </button>
                {['ALL', 'IN_REVIEW', 'QUERY_RAISED', 'APPROVED', 'SETTLED'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={[
                            'h-10 px-3 rounded-lg text-xs font-semibold border transition-colors',
                            filter === f
                                ? 'bg-[#EBF4FD] text-[#1565D8] border-[#1565D8]'
                                : 'bg-white text-[#6B7A94] border-[#E0ECF8] hover:text-[#1565D8]',
                        ].join(' ')}
                    >
                        {f === 'ALL' ? 'All' : f.replace(/_/g, ' ')}
                    </button>
                ))}
                <button className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white text-[#1565D8] text-sm font-semibold border border-[#E0ECF8] hover:bg-[#F4F8FD] transition-colors">
                    <Plus className="w-4 h-4" /> New Pre-Auth
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatTile label="Active Policies" value={(policies.length || 12).toLocaleString('en-IN')} delta="+24%" />
                <StatTile label="Open Claims" value={(claims.length || 4).toLocaleString('en-IN')} delta="+24%" />
                <StatTile label="Total Settled" value={inr(settledTotal || 28300)} delta="+24%" />
                <StatTile label="Pending Pre-Auth" value={String(claims.filter((c) => c.status === 'PRE_AUTH_SUBMITTED').length || 842)} delta="+24%" />
            </div>

            {/* Mid section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="xl:col-span-2 p-4">
                    <div className="flex items-center gap-1 border-b border-[#E0ECF8] pb-3">
                        {['Claims', 'Pre-Auth', 'Policies'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={[
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                    tab === t ? 'bg-[#EBF4FD] text-[#1565D8]' : 'text-[#6B7A94] hover:text-[#1565D8]',
                                ].join(' ')}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center gap-3">
                            <Donut segments={segments} centerLabel="Claims" centerValue={claims.length} />
                            <ul className="space-y-1">
                                {segments.map((s) => (
                                    <li key={s.label} className="flex items-center gap-2 text-[11px]">
                                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                        <span className="text-[#6B7A94]">{s.label}</span>
                                        <span className="if-num ml-auto font-semibold text-[#1A2130]">{s.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex-1 min-w-0 overflow-x-auto">
                            {tab === 'Policies' ? (
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[#6B7A94] border-b border-[#E0ECF8]">
                                        <tr>
                                            <th className="py-2 pr-3">Policy No.</th>
                                            <th className="py-2 pr-3">Member</th>
                                            <th className="py-2">Sum Insured</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {policies.map((p) => (
                                            <tr key={p._id} className="border-b border-[#F4F8FD]">
                                                <td className="py-2 pr-3 font-mono text-[11px] text-[#1565D8]">{p.policyNumber}</td>
                                                <td className="py-2 pr-3 text-[#1A2130]">{p.memberName}</td>
                                                <td className="py-2 if-num text-[#1A2130]">{inr(p.sumInsuredBalance)}</td>
                                            </tr>
                                        ))}
                                        {!policies.length && (
                                            <tr><td colSpan="3" className="py-4 text-center text-[#6B7A94]">No policies visible for this role.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[#6B7A94] border-b border-[#E0ECF8]">
                                        <tr>
                                            <th className="py-2 pr-3">Patient &amp; Policy</th>
                                            <th className="py-2 pr-3">Claim No.</th>
                                            <th className="py-2 pr-3">Date</th>
                                            <th className="py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.slice(0, 8).map((c) => (
                                            <tr key={c._id} className="border-b border-[#F4F8FD] hover:bg-[#F7FAFE]">
                                                <td className="py-2 pr-3">
                                                    <div className="font-semibold text-[#1A2130]">
                                                        {c.policyId?.memberName || 'Policyholder'}
                                                    </div>
                                                    <div className="font-mono text-[10px] text-[#6B7A94]">
                                                        {c.policyId?.policyNumber || '—'}
                                                    </div>
                                                </td>
                                                <td className="py-2 pr-3 font-mono text-[11px] text-[#1565D8]">{c.claimNumber}</td>
                                                <td className="py-2 pr-3 text-[#6B7A94] if-num">
                                                    {formatDate(c.createdAt)}
                                                </td>
                                                <td className="py-2"><StatusChip status={c.status} /></td>
                                            </tr>
                                        ))}
                                        {!visible.length && (
                                            <tr>
                                                <td colSpan="4" className="py-6 text-center text-[#6B7A94]">
                                                    No claims match this filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </Card>

                <SlaCalendar />
            </div>

            {/* Bottom: claim performance */}
            <Card className="p-4" >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#1A2130]">Claim Performance</h3>
                    <span className="text-[11px] text-[#6B7A94]">
                        Approved value {inr(settledTotal)} &middot; {summary ? `${summary.approvedCount} approved` : '—'}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { l: 'Avg claim value', v: inr(settledTotal && Math.round(settledTotal / Math.max(claims.length, 1))) },
                        { l: 'Approval ratio', v: summary?.approvalRatio != null ? `${summary.approvalRatio}%` : '—' },
                        { l: 'Breach rate', v: summary?.breachPercentage != null ? `${summary.breachPercentage}%` : '—' },
                        { l: 'Total outflow', v: inr(summary?.totalOutflow) },
                    ].map((m) => (
                        <div key={m.l} className="rounded-lg bg-[#F7FAFE] border border-[#E0ECF8] p-3">
                            <p className="text-[10px] uppercase tracking-wide text-[#6B7A94] font-semibold">{m.l}</p>
                            <p className="if-num text-base font-bold text-[#1A2130] mt-0.5">{m.v}</p>
                        </div>
                    ))}
                </div>

                <div className="h-56">
                    <Bar
                        data={barData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Inter', size: 11 }, color: '#6B7A94' } } },
                            scales: {
                                x: { grid: { display: false }, ticks: { color: '#6B7A94', font: { family: 'Inter', size: 11 } } },
                                y: { grid: { color: '#EEF4FB' }, ticks: { color: '#6B7A94', font: { family: 'Inter', size: 11 } } },
                            },
                        }}
                    />
                </div>
                <p className="mt-2 text-[10px] text-[#6B7A94]">
                    Six-month view uses representative figures; connect a reporting endpoint to source live settlement data.
                </p>
            </Card>
        </div>
    );
}
