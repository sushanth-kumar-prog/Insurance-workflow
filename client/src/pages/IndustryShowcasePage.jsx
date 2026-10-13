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
        <div className="max-w-7xl mx-auto space-y-10 pb-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl glass-panel p-8 md:p-12 border-[#B9D6F5]">
                <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 max-w-3xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-500/40 text-blue-200 text-sm font-bold uppercase tracking-wider">
                        <Globe className="w-4 h-4" />
                        IRDAI 2026 Statutory &amp; ABDM NHCX Interoperability Standard
                    </div>
                    <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                        Next-Gen Health Insurance <br />
                        <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-[#a78bfa] bg-clip-text text-transparent">
                            Claim Settlement &amp; Adjudication Architecture
                        </span>
                    </h1>
                    <p className="text-[#1A2130] text-sm md:text-base leading-snug">
                        Eliminating legacy black-box TPA delays with deterministic rules engine execution, smart SLA pause clocks, append-only audit trails, and HL7 FHIR R4 interoperability.
                    </p>
                </div>
            </div>

            {/* 3 Real-World Industry Use Cases */}
            <div className="space-y-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-extrabold text-white">3 High-Impact Real-World Use Cases</h2>
                    <p className="text-[#6B7A94] text-sm mt-1">Solving critical operational pain points across hospitals, insurers, and policyholders.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Use Case 1 */}
                    <div className="glass-panel p-6 space-y-4 border border-[#E0ECF8] bg-[#F7FAFE] hover:border-indigo-400/70 hover:bg-white transition-colors">
                        <div className="p-3 w-fit rounded-xl bg-indigo-600/20 border border-[#B9D6F5] text-[#1565D8]">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-[#1565D8] font-mono">USE CASE #1</span>
                            <h3 className="text-lg font-bold text-white mt-1">Ophthalmic & Cataract Cashless Pre-Auth</h3>
                        </div>
                        <p className="text-sm text-[#1A2130] leading-relaxed">
                            Automates waiting period validation for pre-existing cataracts, caps IOL lens tariffs automatically based on policy clauses, checks biometry compliance, and detects rapid second-eye duplicate claim fraud.
                        </p>
                        <div className="pt-2 border-t border-[#E0ECF8] text-xs text-[#6B7A94] flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-[#1565D8]">Eye Hospitals & Patients</strong>
                        </div>
                    </div>

                    {/* Use Case 2 */}
                    <div className="glass-panel p-6 space-y-4 border border-[#E0ECF8] bg-[#F7FAFE] hover:border-violet-400/70 hover:bg-white transition-colors">
                        <div className="p-3 w-fit rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-purple-400 font-mono">USE CASE #2</span>
                            <h3 className="text-lg font-bold text-white mt-1">IRDAI 1-Hr & 3-Hr Discharge SLA Mandates</h3>
                        </div>
                        <p className="text-sm text-[#1A2130] leading-relaxed">
                            Enforces the IRDAI 1-hour pre-authorization and 3-hour final discharge settlement deadlines. Smart clock automatically pauses during document query loops and resumes without resetting total elapsed time.
                        </p>
                        <div className="pt-2 border-t border-[#E0ECF8] text-xs text-[#6B7A94] flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-purple-300">Hospital Desks & Insurers</strong>
                        </div>
                    </div>

                    {/* Use Case 3 */}
                    <div className="glass-panel p-6 space-y-4 border border-[#E0ECF8] bg-[#F7FAFE] hover:border-sky-400/70 hover:bg-white transition-colors">
                        <div className="p-3 w-fit rounded-xl bg-sky-600/20 border border-sky-500/30 text-[#0284C7]">
                            <FileCode className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-[#0284C7] font-mono">USE CASE #3</span>
                            <h3 className="text-lg font-bold text-white mt-1">NHCX ABDM Unified FHIR Data Exchange</h3>
                        </div>
                        <p className="text-sm text-[#1A2130] leading-relaxed">
                            Serializes unstructured claim data into HL7 FHIR R4 standard JSON (<code className="text-[#0284C7] font-mono">resourceType: "Claim"</code>). Enables seamless single-pipe transmission to National Health Claims Exchange gateways.
                        </p>
                        <div className="pt-2 border-t border-[#E0ECF8] text-xs text-[#6B7A94] flex items-center justify-between">
                            <span>Primary Stakeholder:</span>
                            <strong className="text-[#0284C7]">National Health Authority (NHA)</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Industry Gaps Comparison Matrix */}
            <div className="glass-panel p-8 space-y-6">
                <div className="border-b border-[#E0ECF8] pb-4">
                    <h2 className="text-xl font-bold text-white">Legacy TPA Portals vs. Our InsureFlow Architecture</h2>
                    <p className="text-xs text-[#6B7A94] mt-1">How our system eliminates industry bottlenecks and fills statutory compliance gaps.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F7FAFE] text-[#1A2130] font-semibold border-b border-[#E0ECF8]">
                            <tr>
                                <th className="px-3 py-2">Core Dimension</th>
                                <th className="px-3 py-2 text-red-400">Legacy TPA / Existing Portals</th>
                                <th className="px-3 py-2 text-emerald-400">InsureFlow Innovation Platform</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0ECF8]">
                            <tr className="hover:bg-[#F7FAFE]">
                                <td className="px-3 py-2 font-bold text-[#1A2130]">Adjudication Transparency</td>
                                <td className="px-3 py-2 text-[#6B7A94]">Opaque "Black Box" rejections with no explicit policy clause citations.</td>
                                <td className="px-3 py-2 text-[#15803D] font-medium">100% Transparent clause-level deduction mapping (<code className="text-emerald-400 font-mono">policyClauseRef</code>) for every rupee.</td>
                            </tr>
                            <tr className="hover:bg-[#F7FAFE]">
                                <td className="px-3 py-2 font-bold text-[#1A2130]">IRDAI Statutory SLA Clock</td>
                                <td className="px-3 py-2 text-[#6B7A94]">Artificial query loops at minute 59 used to reset timers endlessly.</td>
                                <td className="px-3 py-2 text-[#15803D] font-medium">Pause-and-Resume SLA Clock engine. Tracks true cumulative processing time across query loops.</td>
                            </tr>
                            <tr className="hover:bg-[#F7FAFE]">
                                <td className="px-3 py-2 font-bold text-[#1A2130]">Data Standardization</td>
                                <td className="px-3 py-2 text-[#6B7A94]">Fragmented PDF uploads across 25+ isolated insurer portals.</td>
                                <td className="px-3 py-2 text-[#15803D] font-medium">Built-in HL7 FHIR R4 JSON Serializer compatible with ABDM NHCX router specs.</td>
                            </tr>
                            <tr className="hover:bg-[#F7FAFE]">
                                <td className="px-3 py-2 font-bold text-[#1A2130]">Audit &amp; Integrity</td>
                                <td className="px-3 py-2 text-[#6B7A94]">Mutable database status updates prone to dispute and overwrite.</td>
                                <td className="px-3 py-2 text-[#15803D] font-medium">Immutable append-only Mongoose Audit Logs with schema-level pre-save delete locks.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IndustryShowcasePage;
