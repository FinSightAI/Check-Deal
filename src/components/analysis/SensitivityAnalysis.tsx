'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface Props {
  deal: Deal;
}

interface Overrides {
  pricePct: number;
  rentPct: number;
  rateDelta: number;
  vacancyDelta: number;
  appreciationDelta: number;
}

const ZERO: Overrides = { pricePct: 0, rentPct: 0, rateDelta: 0, vacancyDelta: 0, appreciationDelta: 0 };

function applyOverrides(deal: Deal, o: Overrides): Deal {
  const d = JSON.parse(JSON.stringify(deal)) as Deal;
  const origPrice = d.property.agreedPrice || d.property.askingPrice;
  const newPrice = origPrice * (1 + o.pricePct / 100);
  d.property.askingPrice = newPrice;
  d.property.agreedPrice = newPrice;
  if (d.financing.financingType !== 'cash') {
    const dpPct = d.financing.downPaymentPercent / 100;
    d.financing.downPaymentAmount = newPrice * dpPct;
    d.financing.loanAmount = newPrice * (1 - dpPct);
  }
  d.rentalAssumptions.ltr.monthlyRent = Math.max(100,
    (d.rentalAssumptions.ltr.monthlyRent) * (1 + o.rentPct / 100));
  d.financing.interestRate = Math.max(1, d.financing.interestRate + o.rateDelta);
  d.rentalAssumptions.ltr.vacancyRatePercent = Math.max(0,
    Math.min(50, d.rentalAssumptions.ltr.vacancyRatePercent + o.vacancyDelta));
  d.userOverrides.appreciationRateOverride = Math.max(0,
    (d.userOverrides.appreciationRateOverride ?? 6.5) + o.appreciationDelta);
  return d;
}

export function SensitivityAnalysis({ deal }: Props) {
  const [overrides, setOverrides] = useState<Overrides>(ZERO);
  const [modAnalysis, setModAnalysis] = useState<DealAnalysis | null>(deal.analysis ?? null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const base = deal.analysis;

  const fetchModified = useCallback(async (o: Overrides) => {
    if (Object.values(o).every((v) => v === 0)) {
      setModAnalysis(deal.analysis ?? null);
      return;
    }
    setLoading(true);
    try {
      const modDeal = applyOverrides(deal, o);
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal: modDeal }),
      });
      if (res.ok) {
        const data = await res.json();
        setModAnalysis(data.analysis);
      }
    } catch { /* keep previous */ }
    finally { setLoading(false); }
  }, [deal]);

  // Debounce slider changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchModified(overrides), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [overrides, fetchModified]);

  const isModified = Object.values(overrides).some((v) => v !== 0);
  const mod = modAnalysis;

  const Δ = (base: number | undefined, mod: number | undefined) => {
    if (base == null || mod == null) return null;
    const d = mod - base;
    if (Math.abs(d) < 0.01) return null;
    return (
      <span className={`text-xs ml-1 font-medium ${d > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        {d > 0 ? '+' : ''}{d.toFixed(1)}
      </span>
    );
  };

  const SLIDERS = [
    { key: 'pricePct' as keyof Overrides, label: 'Purchase Price', min: -25, max: 25, step: 1, unit: '%' },
    { key: 'rentPct' as keyof Overrides, label: 'Monthly Rent', min: -30, max: 30, step: 1, unit: '%' },
    { key: 'rateDelta' as keyof Overrides, label: 'Interest Rate', min: -4, max: 5, step: 0.25, unit: 'pp' },
    { key: 'vacancyDelta' as keyof Overrides, label: 'Vacancy Rate', min: -5, max: 15, step: 1, unit: 'pp' },
    { key: 'appreciationDelta' as keyof Overrides, label: 'Appreciation', min: -4, max: 4, step: 0.5, unit: 'pp' },
  ];

  const METRICS = [
    { label: 'Gross Yield', base: base?.returns.grossYield, mod: mod?.returns.grossYield, good: (v: number) => v >= 5, fmt: (v: number) => formatPercent(v) },
    { label: 'Net Yield', base: base?.returns.netYield, mod: mod?.returns.netYield, good: (v: number) => v >= 3.5, fmt: (v: number) => formatPercent(v) },
    { label: 'Cap Rate', base: base?.returns.capRate, mod: mod?.returns.capRate, good: (v: number) => v >= 4, fmt: (v: number) => formatPercent(v) },
    { label: 'Cash-on-Cash Y1', base: base?.returns.cashOnCashReturn, mod: mod?.returns.cashOnCashReturn, good: (v: number) => v >= 0, fmt: (v: number) => formatPercent(v) },
    { label: '10Y IRR', base: base?.returns.projections.find(p => p.years === 10)?.irr, mod: mod?.returns.projections.find(p => p.years === 10)?.irr, good: (v: number) => v >= 10, fmt: (v: number) => formatPercent(v) },
    { label: 'Deal Score', base: base?.dealScore.total, mod: mod?.dealScore.total, good: (v: number) => v >= 60, fmt: (v: number) => `${v.toFixed(0)}/100` },
    { label: 'Monthly CF (Y1)', base: base?.cashFlows[0] ? base.cashFlows[0].cashFlow / 12 : undefined, mod: mod?.cashFlows[0] ? mod.cashFlows[0].cashFlow / 12 : undefined, good: (v: number) => v >= 0, fmt: (v: number) => formatCurrency(v, 'BRL') },
  ];

  const SCENARIOS = [
    { label: '🐂 Bull Case', o: { pricePct: -5, rentPct: 10, rateDelta: -1, vacancyDelta: -2, appreciationDelta: 2 } },
    { label: '🐻 Bear Case', o: { pricePct: 5, rentPct: -10, rateDelta: 2, vacancyDelta: 5, appreciationDelta: -2 } },
    { label: '🏷️ Negotiate -10%', o: { pricePct: -10, rentPct: 0, rateDelta: 0, vacancyDelta: 0, appreciationDelta: 0 } },
    { label: '📈 Rent +20%', o: { pricePct: 0, rentPct: 20, rateDelta: 0, vacancyDelta: 0, appreciationDelta: 0 } },
    { label: '💸 Rate +3pp', o: { pricePct: 0, rentPct: 0, rateDelta: 3, vacancyDelta: 0, appreciationDelta: 0 } },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Sensitivity Analysis</h3>
          <p className="text-xs text-slate-400 mt-0.5">Adjust assumptions — metrics update automatically</p>
        </div>
        {isModified && (
          <button onClick={() => setOverrides(ZERO)} className="text-xs text-blue-500 hover:underline">
            Reset to base
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-600">Adjust Assumptions</h4>
            {loading && <span className="text-xs text-blue-500 animate-pulse">Recalculating…</span>}
          </div>
          {SLIDERS.map((s) => {
            const val = overrides[s.key] as number;
            const pct = ((val - s.min) / (s.max - s.min)) * 100;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-slate-700">{s.label}</label>
                  <span className={`text-sm font-bold tabular-nums ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {val > 0 ? '+' : ''}{val}{s.unit}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range" min={s.min} max={s.max} step={s.step} value={val}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [s.key]: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
                    style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, #e2e8f0 ${pct}%)` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{s.min}{s.unit}</span>
                  <span className="text-slate-300">|</span>
                  <span>+{s.max}{s.unit}</span>
                </div>
              </div>
            );
          })}

          {/* Quick scenarios */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-400 mb-2">QUICK SCENARIOS</p>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((sc) => (
                <button key={sc.label} onClick={() => setOverrides(sc.o)}
                  className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-600 hover:text-blue-700 transition-colors">
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live metrics */}
        <div className="space-y-2">
          {METRICS.map((m) => {
            const current = isModified ? m.mod : m.base;
            const isGood = current != null && m.good(current);
            return (
              <div key={m.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                current != null
                  ? isGood ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-sm text-slate-600">{m.label}</span>
                <div className="flex items-center gap-1">
                  {isModified && m.base != null && (
                    <span className="text-xs text-slate-400 line-through">{m.fmt(m.base)}</span>
                  )}
                  {current != null && (
                    <span className={`text-sm font-bold ${isGood ? 'text-emerald-700' : 'text-red-700'}`}>
                      {m.fmt(current)}
                    </span>
                  )}
                  {isModified && Δ(m.base, m.mod)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
