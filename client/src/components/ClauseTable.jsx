import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import LineItemDisputeModal from './LineItemDisputeModal';

/**
 * ClauseTable — itemised deduction breakdown with clause references.
 *
 * Props:
 *   deductions     array  Rows from adjudicationResult.itemizedDeductions
 *   claimId        string When provided, each row gets a "Dispute" trigger.
 *   onDisputeFiled fn     Optional callback after a dispute is filed.
 */
const ClauseTable = ({ deductions = [], claimId, onDisputeFiled }) => {
    if (!deductions || deductions.length === 0) {
        return (
            <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                <span>✓ Zero deductions! All claimed bill items are fully payable under policy terms.</span>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                        <th className="p-3">Item Code & Desc</th>
                        <th className="p-3">Billed</th>
                        <th className="p-3 text-red-400">Deducted</th>
                        <th className="p-3">Reason Code</th>
                        <th className="p-3">Policy Clause Ref</th>
                        {claimId && <th className="p-3">Action</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {deductions.map((d, index) => (
                        <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3">
                                <div className="font-medium text-slate-200">{d.description}</div>
                                <div className="text-xs text-slate-500 font-mono">{d.itemCode}</div>
                            </td>
                            <td className="p-3 text-slate-300 font-mono">₹{d.billedAmount?.toLocaleString()}</td>
                            <td className="p-3 text-red-400 font-semibold font-mono">-₹{d.deductedAmount?.toLocaleString()}</td>
                            <td className="p-3">
                                <span className="badge badge-danger">
                                    <ShieldAlert className="w-3 h-3" />
                                    {d.reasonCode}
                                </span>
                            </td>
                            <td className="p-3 text-indigo-300 font-medium flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>{d.policyClauseRef}</span>
                            </td>
                            {claimId && (
                                <td className="p-3">
                                    <LineItemDisputeModal
                                        claimId={claimId}
                                        deduction={d}
                                        onDisputeFiled={onDisputeFiled}
                                    />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ClauseTable;
