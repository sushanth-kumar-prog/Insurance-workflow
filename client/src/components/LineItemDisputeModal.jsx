import { useState } from 'react';
import axios from 'axios';

/**
 * LineItemDisputeModal — "Dispute" trigger on a deduction row.
 *
 * Props:
 *   claimId        string  Claim ObjectId
 *   deduction      object  A row from adjudicationResult.itemizedDeductions
 *                           { itemCode, description, billedAmount, deductedAmount,
 *                             reasonCode, policyClauseRef }
 *   onDisputeFiled fn      Optional callback after a successful post.
 *
 * Posts to POST /api/claims/:id/dispute-line-item. The backend validates the
 * deduction against the claim and appends to the audit log; claim status is
 * unchanged.
 */
export default function LineItemDisputeModal({ claimId, deduction, onDisputeFiled }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [supporting, setSupporting] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  function openModal() {
    setReason('');
    setSupporting('');
    setStatus('idle');
    setErrorMsg('');
    setOpen(true);
  }

  function closeModal() {
    if (status === 'submitting') return;
    setOpen(false);
  }

  async function submitDispute() {
    if (!reason.trim()) {
      setErrorMsg('Please explain why you are disputing this deduction.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      await axios.post(
        `/api/claims/${claimId}/dispute-line-item`,
        {
          reasonCode: deduction.reasonCode,
          policyClauseRef: deduction.policyClauseRef,
          itemCode: deduction.itemCode,
          disputeReason: reason.trim(),
          supportingNote: supporting.trim(),
        },
        { withCredentials: true }
      );
      setStatus('success');
      if (onDisputeFiled) onDisputeFiled();
    } catch (err) {
      setStatus('error');
      // The API returns `error`, not `message`.
      setErrorMsg(err.response?.data?.error || 'Could not file dispute. Try again.');
    }
  }

  // Labels must match src/engine/constants.js REASON_CODES.
  const REASON_LABELS = {
    NON_PAYABLE_CONSUMABLE: 'Non-payable item',
    SUB_LIMIT_EXCEEDED: 'Sub-limit exceeded',
    WAITING_PERIOD_ACTIVE: 'Waiting period active',
    SI_EXCEEDED: 'Sum insured exhausted',
    TARIFF_CAP_EXCEEDED: 'IOL tariff cap exceeded',
  };

  const displayReason = REASON_LABELS[deduction?.reasonCode] || deduction?.reasonCode || 'Deduction';
  const amount = deduction?.deductedAmount;

  return (
    <>
      <button
        onClick={openModal}
        className="text-xs text-indigo-300 hover:text-indigo-100 underline underline-offset-2 font-medium"
      >
        Dispute
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-base">Dispute Deduction</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-red-300">{displayReason}</span>
                  {amount != null && (
                    <span className="font-bold text-red-400">− ₹{Number(amount).toLocaleString('en-IN')}</span>
                  )}
                </div>
                {deduction?.policyClauseRef && (
                  <p className="text-red-400/80 text-xs font-mono">{deduction.policyClauseRef}</p>
                )}
                {deduction?.itemCode && (
                  <p className="text-red-400/80 text-xs">{deduction.itemCode} — {deduction.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Why do you disagree? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={status !== 'idle'}
                  rows={3}
                  placeholder="e.g. The consumables billed were medically necessary for this procedure."
                  className="w-full text-sm resize-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Supporting evidence <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={supporting}
                  onChange={(e) => setSupporting(e.target.value)}
                  disabled={status !== 'idle'}
                  placeholder="e.g. Invoice no. 4521"
                />
              </div>

              {errorMsg && (
                <p className="text-red-300 text-sm bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">⚠ {errorMsg}</p>
              )}

              {status === 'success' && (
                <p className="text-emerald-300 text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2">
                  ✅ Dispute filed. A verifier will review and respond.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-700">
              <button
                onClick={closeModal}
                disabled={status === 'submitting'}
                className="btn-secondary"
              >
                {status === 'success' ? 'Close' : 'Cancel'}
              </button>

              {status !== 'success' && (
                <button
                  onClick={submitDispute}
                  disabled={status === 'submitting'}
                  className="btn-primary"
                >
                  {status === 'submitting' ? 'Filing…' : 'File Dispute'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
