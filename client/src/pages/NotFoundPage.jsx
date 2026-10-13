import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-[#EBF4FD] flex items-center justify-center p-6">
            <div className="text-center rounded-xl bg-white border border-[#E0ECF8] p-10 max-w-md"
                 style={{ boxShadow: '0 1px 4px rgba(21,101,216,0.08)' }}>
                <Compass className="w-10 h-10 text-[#1565D8] mx-auto" />
                <h1 className="mt-3 text-xl font-bold text-[#1A2130]">Page not built yet</h1>
                <p className="mt-1 text-sm text-[#6B7A94]">
                    This area is on the roadmap. The dashboard, claims, pre-authorisation and policy
                    views are live.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                    <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-[#1565D8] text-white text-sm font-semibold hover:bg-[#1259BE]">
                        Back to dashboard
                    </Link>
                    <Link to="/showcase" className="px-4 py-2 rounded-lg bg-white border border-[#E0ECF8] text-[#1565D8] text-sm font-semibold hover:bg-[#F4F8FD]">
                        Showcase
                    </Link>
                </div>
            </div>
        </div>
    );
}
