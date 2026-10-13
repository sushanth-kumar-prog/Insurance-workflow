import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ShieldCheck,
    FileCheck2,
    Users,
    Wallet,
    BarChart3,
    FolderOpen,
    FileBarChart,
    X,
} from 'lucide-react';

/**
 * Sidebar — 86px fixed rail of icon + label nav items.
 *
 * `disabled` items are rendered but not navigable: the route does not exist yet.
 * They are kept visible so the information architecture is honest about what is
 * planned rather than silently omitting it.
 */
export const NAV_ITEMS = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Claims', to: '/claims', icon: FileText },
    { label: 'Pre-Auth', to: '/preauth', icon: ShieldCheck },
    { label: 'Policies', to: '/policies', icon: FileCheck2 },
    { label: 'Patients', to: '/patients', icon: Users, disabled: true },
    { label: 'Payments', to: '/payments', icon: Wallet, disabled: true },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Documents', to: '/documents', icon: FolderOpen, disabled: true },
    { label: 'Reports', to: '/reports', icon: FileBarChart, disabled: true },
];

export default function Sidebar({ open, onClose }) {
    return (
        <>
            {/* Mobile backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside
                className={[
                    'fixed lg:sticky top-0 left-0 z-40 h-screen w-[86px] shrink-0',
                    'bg-white border-r border-[#E0ECF8] flex flex-col items-center',
                    'py-4 transition-transform duration-200',
                    open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                ].join(' ')}
            >
                {/* Mobile close */}
                <button
                    onClick={onClose}
                    className="lg:hidden absolute top-3 right-2 text-[#6B7A94] hover:text-[#1565D8]"
                    aria-label="Close navigation"
                >
                    <X className="w-5 h-5" />
                </button>

                <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 mt-2 lg:mt-0 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;

                        if (item.disabled) {
                            return (
                                <div
                                    key={item.label}
                                    className="group relative w-[70px] flex flex-col items-center gap-1 py-2 rounded-xl text-[#B9C4D6] cursor-not-allowed"
                                >
                                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                                    <span className="text-[10px] leading-tight text-center">{item.label}</span>

                                    {/* Hover tooltip; non-clickable, announced to AT */}
                                    <span
                                        role="tooltip"
                                        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2
                                                   whitespace-nowrap rounded-md bg-[#1A2130] px-2 py-1 text-[10px]
                                                   font-semibold text-white opacity-0 shadow-lg transition-opacity
                                                   group-hover:opacity-100 group-focus-within:opacity-100"
                                    >
                                        Coming Soon
                                        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#1A2130]" />
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                onClick={onClose}
                                className={({ isActive }) => [
                                    'w-[70px] flex flex-col items-center gap-1 py-2 rounded-xl',
                                    'text-[10px] leading-tight transition-colors',
                                    isActive
                                        ? 'bg-[#EBF4FD] text-[#1565D8] font-semibold'
                                        : 'text-[#6B7A94] hover:bg-[#F4F8FD] hover:text-[#1565D8]',
                                ].join(' ')}
                            >
                                <Icon className="w-5 h-5" strokeWidth={1.75} />
                                <span className="text-center">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
