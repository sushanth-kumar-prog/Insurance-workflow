import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, ChevronDown, Menu, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function initialsOf(name = '') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?';
}

/**
 * TopBar — page title, search, SLA credits, notifications and the user chip.
 */
export default function TopBar({ title, onMenuClick, slaCredits }) {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const menuRef = useRef(null);

    // Close the dropdown on an outside click.
    useEffect(() => {
        function onDocClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    return (
        <header className="h-16 shrink-0 bg-white border-b border-[#E0ECF8] flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-20">
            <button
                onClick={onMenuClick}
                className="lg:hidden text-[#6B7A94] hover:text-[#1565D8]"
                aria-label="Open navigation"
            >
                <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-lg font-bold text-[#1A2130] hidden sm:block whitespace-nowrap">{title}</h1>

            {/* Search */}
            <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A94] pointer-events-none" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search claims, policies, patients"
                    aria-label="Search"
                    className="w-full h-10 pl-9 pr-3 rounded-full bg-[#EBF4FD] border border-transparent text-sm
                               placeholder:text-[#6B7A94] focus:bg-white focus:border-[#1565D8] outline-none transition-colors"
                />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* SLA credits */}
                <span
                    className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full
                               bg-[#FEF7E6] border border-[#F2DFB6] text-[#92400E] text-xs font-semibold whitespace-nowrap"
                    title="SLA credits remaining"
                >
                    <Coins className="w-4 h-4 text-[#D9A441]" />
                    <span className="if-num">
                        {(slaCredits ?? 1280).toLocaleString('en-IN')}
                    </span>
                    <span className="font-normal">credits</span>
                </span>

                {/* Notifications */}
                <button
                    className="relative w-9 h-9 rounded-full hover:bg-[#EBF4FD] flex items-center justify-center text-[#6B7A94] hover:text-[#1565D8] transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                        3
                    </span>
                </button>

                {/* User chip */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-full border border-[#E0ECF8] bg-white hover:bg-[#F4F8FD] transition-colors"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                    >
                        <span className="w-8 h-8 rounded-full bg-[#1565D8] text-white text-xs font-bold flex items-center justify-center">
                            {initialsOf(user?.name)}
                        </span>
                        <span className="hidden md:flex flex-col items-start leading-tight">
                            <span className="text-xs font-semibold text-[#1A2130]">{user?.name || 'Guest'}</span>
                            <span className="text-[10px] text-[#6B7A94]">{user?.role || '—'}</span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#6B7A94]" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#E0ECF8] shadow-lg py-1 z-30">
                            <Link
                                to="/showcase"
                                onClick={() => setMenuOpen(false)}
                                className="block px-4 py-2 text-sm text-[#1A2130] hover:bg-[#EBF4FD]"
                            >
                                Architecture showcase
                            </Link>
                            <Link
                                to="/simulator"
                                onClick={() => setMenuOpen(false)}
                                className="block px-4 py-2 text-sm text-[#1A2130] hover:bg-[#EBF4FD]"
                            >
                                Claim simulator
                            </Link>
                            <button
                                onClick={() => { setMenuOpen(false); logout(); }}
                                className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FDECEC]"
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
