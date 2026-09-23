import React, { useState } from 'react';
import api from '../api/client';
import ClauseTable from '../components/ClauseTable';
import { Calculator, AlertTriangle, FileWarning, Plus, Trash2, ShieldCheck, CheckCircle } from 'lucide-react';

const SimulatorPage = () => {
    // Form State
    const [sumInsuredBalance, setSumInsuredBalance] = useState(50000);
    const [waitingPeriodMonths, setWaitingPeriodMonths] = useState(24);
    const [elapsedMonths, setElapsedMonths] = useState(12);
    const [roomCap, setRoomCap] = useState(5000);
    const [iolTariffCap, setIolTariffCap] = useState(15000);

    const [isPreExisting, setIsPreExisting] = useState(true);
    const [eyeSide, setEyeSide] = useState('LEFT');
    const [documents, setDocuments] = useState(['BIOMETRY_REPORT']); // missing IOL_STICKER for testing

    const [billItems, setBillItems] = useState([
        { itemCode: 'ROOM-1', category: 'ROOM_RENT', description: 'Super Deluxe Room Rent', billedAmount: 8000 },
        { itemCode: 'GLOVES-01', category: 'GLOVES', description: 'Sterile Surgical Gloves', billedAmount: 1200 },
        { itemCode: 'IOL-MONO', category: 'IOL', description: 'Monofocal Intraocular Lens', billedAmount: 22000 },
        { itemCode: 'CATARACT-OP', category: 'PROCEDURE', description: 'Left Eye Phacoemulsification Cataract Surgery', billedAmount: 35000 }
    ]);

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddItem = () => {
        setBillItems([
            ...billItems,
            { itemCode: `ITEM-${billItems.length + 1}`, category: 'PROCEDURE', description: 'New Procedure Item', billedAmount: 5000 }
        ]);
    };

    const handleRemoveItem = (index) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...billItems];
        updated[index][field] = field === 'billedAmount' ? parseFloat(value) || 0 : value;
        setBillItems(updated);
    };

    const handleSimulate = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                policyDetails: {
                    sumInsuredBalance: parseFloat(sumInsuredBalance),
                    waitingPeriodMonths: parseInt(waitingPeriodMonths),
                    elapsedMonths: parseInt(elapsedMonths),
                    roomCap: parseFloat(roomCap),
                    iolTariffCap: parseFloat(iolTariffCap)
                },
                claimDraft: {
                    isPreExisting,
                    eyeProcedure: { eye: eyeSide },
                    documents,
                    billItems
                }
            };

            const res = await api.post('/simulator/evaluate', payload);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Simulation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
                        <Calculator className="w-4 h-4" />
                        Dry-Run Rule Engine Simulator
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">Pre-Submission Claim Simulator</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Test claim drafts against IRDAI statutory rules, room-rent sublimits, waiting periods & non-payable lists in dry-run mode without writing to database.
                    </p>
                </div>
                <button onClick={handleSimulate} disabled={loading} className="btn-primary py-3 px-6 text-base font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                    {loading ? 'Evaluating Rules...' : 'Run Simulation'}
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Config & Bill Items */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Policy & Claim Controls */}
                    <div className="glass-panel p-6 space-y-4">
                        <h2 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">Policy & Condition Parameters</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Available Sum Insured (₹)</label>
                                <input
                                    type="number"
                                    value={sumInsuredBalance}
                                    onChange={(e) => setSumInsuredBalance(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Waiting Period (Months)</label>
                                <input
                                    type="number"
                                    value={waitingPeriodMonths}
                                    onChange={(e) => setWaitingPeriodMonths(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Elapsed Months</label>
                                <input
                                    type="number"
                                    value={elapsedMonths}
                                    onChange={(e) => setElapsedMonths(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Room Rent Cap (₹/day)</label>
                                <input
                                    type="number"
                                    value={roomCap}
                                    onChange={(e) => setRoomCap(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">IOL Tariff Cap (₹)</label>
                                <input
                                    type="number"
                                    value={iolTariffCap}
                                    onChange={(e) => setIolTariffCap(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Eye Surgery Side</label>
                                <select value={eyeSide} onChange={(e) => setEyeSide(e.target.value)}>
                                    <option value="LEFT">Left Eye</option>
                                    <option value="RIGHT">Right Eye</option>
                                    <option value="BOTH">Bilateral Both</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPreExisting}
                                    onChange={(e) => setIsPreExisting(e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 rounded"
                                />
                                Is Pre-Existing Condition?
                            </label>

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={documents.includes('IOL_STICKER')}
                                    onChange={(e) => {
                                        if (e.target.checked) setDocuments([...documents, 'IOL_STICKER']);
                                        else setDocuments(documents.filter(d => d !== 'IOL_STICKER'));
                                    }}
                                    className="w-4 h-4 accent-indigo-600 rounded"
                                />
                                Include IOL Sticker Doc
                            </label>
                        </div>
                    </div>

                    {/* Bill Items Form */}
                    <div className="glass-panel p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h2 className="text-base font-bold text-slate-200">Bill Items Breakdown</h2>
                            <button onClick={handleAddItem} className="btn-secondary py-1 px-3 text-xs">
                                <Plus className="w-3.5 h-3.5" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {billItems.map((item, idx) => (
                                <div key={idx} className="p-3 glass-card flex flex-col md:flex-row items-center gap-3">
                                    <div className="w-full md:w-32">
                                        <input
                                            type="text"
                                            placeholder="Code"
                                            value={item.itemCode}
                                            onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full md:w-36">
                                        <select
                                            value={item.category}
                                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                        >
                                            <option value="PROCEDURE">PROCEDURE</option>
                                            <option value="ROOM_RENT">ROOM_RENT</option>
                                            <option value="IOL">IOL (Lens)</option>
                                            <option value="GLOVES">GLOVES (Non-payable)</option>
                                            <option value="ADMIN_FEE">ADMIN_FEE (Non-payable)</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Description"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full md:w-28">
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={item.billedAmount}
                                            onChange={(e) => handleItemChange(idx, 'billedAmount', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Simulation Output */}
                <div className="lg:col-span-5 space-y-6">
                    {result ? (
                        <div className="glass-panel p-6 space-y-6 border-indigo-500/30">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="badge badge-info text-xs">Dry-Run Output</span>
                                <span className="text-xs text-slate-400 font-mono">
                                    Evaluated at: {new Date(result.evaluatedAt).toLocaleTimeString()}
                                </span>
                            </div>

                            {/* Financial Summary KPI Cards */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 glass-card">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Total Billed</div>
                                    <div className="text-lg font-bold text-slate-200 mt-1">₹{result.summary.totalBilled.toLocaleString()}</div>
                                </div>
                                <div className="p-3 glass-card bg-emerald-950/20 border-emerald-500/30">
                                    <div className="text-xs text-emerald-400 uppercase font-semibold">Est. Approval</div>
                                    <div className="text-xl font-extrabold text-emerald-400 mt-1">₹{result.summary.estimatedApprovalAmount.toLocaleString()}</div>
                                </div>
                                <div className="p-3 glass-card bg-red-950/20 border-red-500/30">
                                    <div className="text-xs text-red-400 uppercase font-semibold">Total Deductions</div>
                                    <div className="text-xl font-extrabold text-red-400 mt-1">₹{result.summary.totalDeductions.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Fraud Flags */}
                            {result.fraudWarningFlags && result.fraudWarningFlags.length > 0 && (
                                <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        Fraud & Anomaly Warning Flags ({result.fraudWarningFlags.length})
                                    </div>
                                    <div className="space-y-1">
                                        {result.fraudWarningFlags.map((flag, i) => (
                                            <div key={i} className="text-xs font-mono bg-amber-900/40 px-2 py-1 rounded">
                                                ⚠ {flag}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Missing Documents */}
                            {result.missingDocumentFlags && result.missingDocumentFlags.length > 0 && (
                                <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/40 text-red-300 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <FileWarning className="w-4 h-4 text-red-400" />
                                        Missing Required Documents ({result.missingDocumentFlags.length})
                                    </div>
                                    <div className="space-y-1">
                                        {result.missingDocumentFlags.map((doc, i) => (
                                            <div key={i} className="text-xs font-mono bg-red-900/40 px-2 py-1 rounded">
                                                📄 {doc}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Itemized Deductions Clause Table */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-200 mb-3">Itemised Clause Explanations</h3>
                                <ClauseTable deductions={result.itemizedDeductions} />
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
                            <ShieldCheck className="w-12 h-12 text-slate-700" />
                            <div className="text-base font-semibold text-slate-400">No Simulation Run Yet</div>
                            <p className="text-xs text-slate-500 max-w-xs">
                                Configure policy parameters and bill items on the left, then click "Run Simulation" to evaluate adjudication rules.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimulatorPage;
