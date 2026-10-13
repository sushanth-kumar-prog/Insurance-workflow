import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function initialsOf(name = '') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase() || '?';
}

/** To-do entries, each with a colored left stripe. */
const TODOS = [
    { color: '#DC2626', title: 'Review 3 flagged claims', desc: 'IOL billed above policy tariff cap' },
    { color: '#D97706', title: 'Respond to document query', desc: 'Biometry report awaited from claimant' },
    { color: '#1565D8', title: 'Approve pre-authorisation', desc: '2 requests pending your sign-off' },
    { color: '#16A34A', title: 'Settle discharge batch', desc: '8 claims ready for payment' },
    { color: '#6B7A94', title: 'Renew expiring policies', desc: '14 policies lapse within 30 days' },
];

/**
 * RightRail — greeting, SLA health score, training card and to-do list.
 *
 * `sla` is the payload returned by GET /api/claims/:id/audit-trail
 * (status/isBreached/remainingMinutes); when absent the score falls back to the
 * analytics summary.
 */
export default function RightRail({ sla, compliance }) {
    const { user } = useAuth();

    const score = compliance ?? (sla ? (sla.isBreached ? 72 : 96) : 94);
    const tier = score >= 95 ? 'Platinum' : score >= 85 ? 'Gold' : 'Silver';

    return (
        <aside className="w-[284px] shrink-0 hidden xl:block">
            <div className="h-full overflow-y-auto px-4 py-4 space-y-4">

                {/* Greeting */}
                <div className="rounded-xl p-4 text-white"
                     style={{ background: 'linear-gradient(135deg, #1E74E8 0%, #6D4AE0 100%)', boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                    <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold">
                            {initialsOf(user?.name)}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{user?.name || 'Guest'}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold uppercase tracking-wide">
                                {user?.role || 'Guest'}
                            </span>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-white/85 leading-relaxed">
                        {sla?.isBreached
                            ? 'An SLA has breached. Immediate attention is recommended.'
                            : 'All statutory SLAs are on track today.'}
                    </p>
                </div>

                {/* SLA health */}
                <div className="rounded-xl bg-white border border-[#E0ECF8] p-4" style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-[#6B7A94]">SLA Health Score</h3>
                        <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="if-num text-2xl font-extrabold text-[#1A2130]">{score}%</span>
                        <span className="text-[11px] text-[#6B7A94]">compliance</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#EBF4FD] overflow-hidden">
                        <div className="h-full rounded-full"
                             style={{ width: `${Math.min(Math.max(score, 0), 100)}%`, background: 'linear-gradient(90deg,#1E74E8,#16A34A)' }} />
                    </div>
                    <p className="mt-2 text-[11px] text-[#6B7A94]">
                        <span className="font-semibold text-[#1565D8]">{tier} tier</span> &middot; IRDAI 1hr / 3hr mandate
                    </p>
                </div>

                {/* Training */}
                <div className="rounded-xl bg-white border border-[#E0ECF8] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                    <div className="h-24 relative flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg,#E8F1FD,#EDE7FB)' }}>
                        <span className="text-3xl">🎓</span>
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-semibold text-[#1565D8]">
                            Certification
                        </span>
                    </div>
                    <div className="p-3">
                        <h3 className="text-sm font-semibold text-[#1A2130] leading-snug">
                            NHCX &amp; FHIR R4 Claim Filing
                        </h3>
                        <p className="mt-1 text-[11px] text-[#6B7A94]">90 min &middot; Beginner</p>
                        <Link
                            to="/showcase"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1565D8] hover:gap-2 transition-all"
                        >
                            Register <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* To-do list */}
                <div className="rounded-xl bg-white border border-[#E0ECF8] p-4" style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#6B7A94] mb-3">
                        To-Do ({TODOS.length})
                    </h3>
                    <ul className="space-y-2.5">
                        {TODOS.map((t) => (
                            <li key={t.title}
                                className="pl-3 flex gap-2 items-start"
                                style={{ borderLeft: `3px solid ${t.color}` }}>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#1A2130] leading-tight">{t.title}</p>
                                    <p className="text-[11px] text-[#6B7A94] leading-tight mt-0.5">{t.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </aside>
    );
}
