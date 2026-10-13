import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RightRail from './RightRail';

/**
 * AppLayout — 3-panel shell: fixed sidebar, flexible main column, fixed rail.
 *
 * `title` drives the TopBar heading; `sla`/`compliance` feed the rail and are
 * supplied by whichever page is rendered, so the rail reflects live data rather
 * than hardcoded placeholders.
 */
export default function AppLayout({ title, children, sla, compliance }) {
    const [navOpen, setNavOpen] = useState(false);

    // PersonaBar clearance is handled once at the App root.
    return (
        <div className="min-h-screen bg-[#EBF4FD] flex">
            <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <TopBar title={title} onMenuClick={() => setNavOpen(true)} />

                <div className="flex-1 flex min-w-0">
                    <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
                        {children}
                    </main>
                    <RightRail sla={sla} compliance={compliance} />
                </div>
            </div>
        </div>
    );
}
