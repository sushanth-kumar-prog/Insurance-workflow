import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * OutOfPocketExplorer — visual cost estimator for cataract claims.
 *
 * Slides between lens types and re-runs the real adjudication engine so the
 * insurer/patient split reflects actual policy rules, not a hardcoded table.
 *
 * Props:
 *   policyId  string  Required. The policy to evaluate against.
 *
 * Contract notes: the simulator expects
 *   { policyDetails: {...}, claimDraft: { billItems: [{ itemCode, description, billedAmount, category }] } }
 * and returns { summary: {...}, itemizedDeductions: [...] }. Categories below
 * must match src/engine/constants.js and adjudicator.js: PROCEDURE, IOL,
 * ROOM_RENT, and a non-payable such as GLOVES.
 */
const LENS_OPTIONS = [
  { id: 'MONOFOCAL',  label: 'Monofocal',  subtitle: 'Standard (fully covered)', cost: 8000  },
  { id: 'TORIC',      label: 'Toric',      subtitle: 'Astigmatism correction',  cost: 22000 },
  { id: 'MULTIFOCAL', label: 'Multifocal', subtitle: 'Near + Distance vision',  cost: 45000 },
];

// Fixed procedure costs; only the lens varies across the slider.
const PROCEDURE_COST = 15000;
const ROOM_COST = 3000;
const NON_PAYABLE_COST = 1200; // GLOVES — stripped by the engine

function useDebouncedCallback(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function OutOfPocketExplorer({ policyId, policyDetails }) {
  const [lensIndex, setLensIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lens = LENS_OPTIONS[lensIndex];

  const buildDraft = (selectedLens) => ({
    claimDraft: {
      isPreExisting: false,
      documents: ['IOL_STICKER', 'BIOMETRY_REPORT'],
      history: [],
      billItems: [
        { itemCode: 'Cataract_Phaco', description: 'Surgery charges', billedAmount: PROCEDURE_COST, category: 'PROCEDURE' },
        { itemCode: 'IOL_ACRYLIC', description: `${selectedLens.label} IOL`, billedAmount: selectedLens.cost, category: 'IOL' },
        { itemCode: 'ROOM_DELUXE', description: 'Day-care room', billedAmount: ROOM_COST, category: 'ROOM_RENT' },
        { itemCode: 'GLOVES', description: 'Surgical gloves', billedAmount: NON_PAYABLE_COST, category: 'GLOVES' },
      ],
    },
    policyDetails: policyDetails || {
      sumInsuredBalance: 250000,
      waitingPeriodMonths: 24,
      elapsedMonths: 36,
      iolTariffCap: 15000,
      roomCap: 5000,
      procedureSublimits: { Cataract_Phaco: 40000 },
    },
  });

  const evaluate = async (selectedLens) => {
    const { data } = await axios.post('/api/simulator/evaluate', buildDraft(selectedLens), {
      withCredentials: true,
    });
    return data;
  };

  const runEvaluation = useDebouncedCallback(async (idx) => {
    setLoading(true);
    setError('');
    try {
      setResult(await evaluate(LENS_OPTIONS[idx]));
    } catch (err) {
      // The API returns `error` (object) or `errors` (validation array).
      const apiError = err.response?.data?.error;
      const validation = err.response?.data?.errors;
      setError(
        typeof apiError === 'string' ? apiError :
        Array.isArray(validation) ? validation.map((e) => e.msg).join(', ') :
        'Simulator error. Is the backend running?'
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    if (policyId) runEvaluation(0);
  }, [policyId, runEvaluation]);

  function handleSlider(e) {
    const idx = Number(e.target.value);
    setLensIndex(idx);
    runEvaluation(idx);
  }

  const approved = result?.summary?.estimatedApprovalAmount ?? null;
  const totalBilled = result?.summary?.totalBilled ?? null;
  const deductions = result?.itemizedDeductions ?? [];
  const flags = result?.fraudWarningFlags ?? [];
  const missingDocs = result?.missingDocumentFlags ?? [];
  const outOfPocket = approved != null && totalBilled != null ? totalBilled - approved : null;

  const inr = (n) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—');

  if (!policyId) {
    return (
      <div className="glass-card p-5 text-sm text-slate-400 text-center">
        Log in as a claimant to see personalised estimates.
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-base">💡 Out-of-Pocket Explorer</h3>
        <p className="text-slate-400 text-sm mt-0.5">
          Slide to compare lens types. Figures come from the live adjudication engine.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          {LENS_OPTIONS.map((l) => <span key={l.id}>{l.label}</span>)}
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={lensIndex}
          onChange={handleSlider}
          aria-label="Lens type"
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      <div className="border border-slate-700 rounded-xl px-4 py-3 flex items-start justify-between bg-slate-800/40">
        <div>
          <p className="font-semibold text-indigo-300">{lens.label} IOL</p>
          <p className="text-xs text-slate-400">{lens.subtitle}</p>
        </div>
        <p className="text-lg font-bold text-indigo-300">{inr(lens.cost)}</p>
      </div>

      {loading && <div className="text-center py-4 text-slate-400 text-sm animate-pulse">Calculating with your policy rules…</div>}

      {error && !loading && (
        <div className="text-red-300 text-sm bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">⚠ {error}</div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Bill</p>
              <p className="text-sm font-bold mt-1">{inr(totalBilled)}</p>
            </div>
            <div className="bg-emerald-950/40 rounded-xl p-3">
              <p className="text-xs text-emerald-400 uppercase tracking-wide">Insurer Pays</p>
              <p className="text-sm font-bold text-emerald-300 mt-1">{inr(approved)}</p>
            </div>
            <div className="bg-amber-950/40 rounded-xl p-3">
              <p className="text-xs text-amber-400 uppercase tracking-wide">You Pay</p>
              <p className="text-sm font-bold text-amber-300 mt-1">{inr(outOfPocket)}</p>
            </div>
          </div>

          {deductions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Policy deductions</p>
              <ul className="divide-y divide-slate-700 border border-slate-700 rounded-lg overflow-hidden text-sm">
                {deductions.map((d, i) => (
                  <li key={i} className="flex justify-between px-3 py-2">
                    <span className="text-slate-300">
                      {d.description || d.reasonCode}
                      {d.policyClauseRef && <span className="ml-1 text-xs text-slate-500 font-mono">({d.policyClauseRef})</span>}
                    </span>
                    <span className="text-red-400 font-medium shrink-0 ml-2">− {inr(d.deductedAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(flags.length > 0 || missingDocs.length > 0) && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-2 text-sm space-y-1">
              {flags.map((f, i) => <p key={i} className="text-amber-300">⚑ {f}</p>)}
              {missingDocs.map((d, i) => <p key={i} className="text-amber-400">📎 Missing: {d}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
