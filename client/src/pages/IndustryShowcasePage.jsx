import React from 'react';
import {
    ShieldCheck,
    Zap,
    Clock,
    FileCode,
    Layers,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Building2,
    Eye,
    Lock,
    BarChart,
    Globe
} from 'lucide-react';

const IndustryShowcasePage = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-16">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl glass-panel p-8 md:p-12 border-indigo-500/30">
                <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5" />
                        IRDAI 2026 Statutory & ABDM NHCX Interoperability Standard
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                        Next-Gen Health Insurance <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Claim Settlement & Adjudication Architecture
                        </span>
                    </h1>
                    <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                        Eliminating legacy black-box TPA delays with deterministic rules engine execution, smart SLA pause clocks, append-only audit trails, and HL7 FHIR R4 interoperability.
                    </p>
                </div>
            </div>

            {/* 3 Real-World Industry Use Cases */}
            <div className="space-y-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-extrabold text-white">3 High-Impact Real-World Use Cases</h2>
                    <p className="text-slate-400 text-sm mt-1">Solving critical operational pain points across hospitals, insurers, and policyholders.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Use Case 1 */}
                    <div className="glass-panel p-6 space-y-4 border-indigo-500/20 hover:border-indigo-500/50 transition-all">
                        <div className="p-3 w-fit rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-indigo-400 font-mono">USE CASE #1</span>
                            <h3 className="text-lg font-bold text-white mt-1">Ophthalmic & Cataract Cashless Pre-Auth</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Automates waiting period validation for pre-existing cataracts, caps IOL lens tariffs automatically based on policy clauses, checks biometry compliance, and detects rapid second-eye duplicate claim fraud.
                        </p>
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-indigo-300">Eye Hospitals & Patients</strong>
                        </div>
                    </div>

                    {/* Use Case 2 */}
                    <div className="glass-panel p-6 space-y-4 border-purple-500/20 hover:border-purple-500/50 transition-all">
                        <div className="p-3 w-fit rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-purple-400 font-mono">USE CASE #2</span>
                            <h3 className="text-lg font-bold text-white mt-1">IRDAI 1-Hr & 3-Hr Discharge SLA Mandates</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Enforces the IRDAI 1-hour pre-authorization and 3-hour final discharge settlement deadlines. Smart clock automatically pauses during document query loops and resumes without resetting total elapsed time.
                        </p>
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-purple-300">Hospital Desks & Insurers</strong>
                        </div>
                    </div>

                    {/* Use Case 3 */}
                    <div className="glass-panel p-6 space-y-4 border-pink-500/20 hover:border-pink-500/50 transition-all">
                        <div className="p-3 w-fit rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-400">
                            <FileCode className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-pink-400 font-mono">USE CASE #3</span>
                            <h3 className="text-lg font-bold text-white mt-1">NHCX ABDM Unified FHIR Data Exchange</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Serializes unstructured claim data into HL7 FHIR R4 standard JSON (<code className="text-pink-300 font-mono">resourceType: "Claim"</code>). Enables seamless single-pipe transmission to National Health Claims Exchange gateways.
                        </p>
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-pink-300">National Health Authority (NHA)</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Industry Gaps Comparison Matrix */}
            <div className="glass-panel p-8 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-xl font-bold text-white">Legacy TPA Portals vs. Our InsureFlow Architecture</h2>
                    <p className="text-xs text-slate-400 mt-1">How our system eliminates industry bottlenecks and fills statutory compliance gaps.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
                            <tr>
                                <th className="p-3">Core Dimension</th>
                                <th className="p-3 text-red-400">Legacy TPA / Existing Portals</th>
                                <th className="p-3 text-emerald-400">InsureFlow Innovation Platform</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            <tr className="hover:bg-slate-800/30">
                                <td className="p-3 font-bold text-slate-200">Adjudication Transparency</td>
                                <td className="p-3 text-slate-400">Opaque "Black Box" rejections with no explicit policy clause citations.</td>
                                <td className="p-3 text-emerald-300 font-medium">100% Transparent clause-level deduction mapping (<code className="text-emerald-400 font-mono">policyClauseRef</code>) for every rupee.</td>
                            </tr>
                            <tr className="hover:bg-slate-800/30">
                                <td className="p-3 font-bold text-slate-200">IRDAI Statutory SLA Clock</td>
                                <td className="p-3 text-slate-400">Artificial query loops at minute 59 used to reset timers endlessly.</td>
                                <td className="p-3 text-emerald-300 font-medium">Pause-and-Resume SLA Clock engine. Tracks true cumulative processing time across query loops.</td>
                            </tr>
                            <tr className="hover:bg-slate-800/30">
                                <td className="p-3 font-bold text-slate-200">Data Standardization</td>
                                <td className="p-3 text-slate-400">Fragmented PDF uploads across 25+ isolated insurer portals.</td>
                                <td className="p-3 text-emerald-300 font-medium">Built-in HL7 FHIR R4 JSON Serializer compatible with ABDM NHCX router specs.</td>
                            </tr>
                            <tr className="hover:bg-slate-800/30">
                                <td className="p-3 font-bold text-slate-200">Audit & Integrity</td>
                                <td className="p-3 text-slate-400">Mutable database status updates prone to dispute and overwrite.</td>
                                <td className="p-3 text-emerald-300 font-medium">Immutable append-only Mongoose Audit Logs with schema-level pre-save delete locks.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IndustryShowcasePage;
