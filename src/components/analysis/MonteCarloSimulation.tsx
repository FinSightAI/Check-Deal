'use client';

import { useState, useMemo } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatPercent, formatCurrency } from '@/lib/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface Props { deal: Deal }

interface SimResult {
  irr: number;
  totalReturn: number;
  finalValue: number;
}

function randn(): number {
  // Box-Muller transform for normal distribution
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runSimulations(deal: Deal, n = 1000, holdYears = 10): SimResult[] {
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const totalCash = deal.analysis!.purchaseCosts.totalCashRequired;
  const baseRent = deal.rentalAssumptions.ltr.monthlyRent;
  const baseAppreciation = deal.analysis!.marketContext.inflationRate + 2; // rough real appreciation
  const vacancyBase = deal.rentalAssumptions.ltr.vacancyRatePercent / 100;
  const annualCosts = deal.analysis!.annualCosts.total;
  const debtService = deal.analysis!.financing.monthlyPayment * 12;

  const results: SimResult[] = [];

  for (let i = 0; i < n; i++) {
    // Randomize key inputs (std devs calibrated for Brazilian market)
    const rentGrowth = (deal.rentalAssumptions.ltr.annualRentGrowthPercent / 100) + randn() * 0.025;
    const appreciation = (baseAppreciation / 100) + randn() * 0.03;
    const vacancyDrift = randn() * 0.03;

    let cumulativeCash = -totalCash;
    let currentRent = baseRent * 12;
    let propertyValue = price;

    for (let y = 1; y <= holdYears; y++) {
      const vacancy = Math.max(0, Math.min(0.3, vacancyBase + vacancyDrift));
      const effectiveRent = currentRent * (1 - vacancy);
      const noi = effectiveRent - annualCosts;
      const cashFlow = noi - debtService;
      cumulativeCash += cashFlow;
      currentRent *= (1 + rentGrowth);
      propertyValue *= (1 + appreciation);
    }

    // Terminal value (add back equity from sale)
    const loanBalance = deal.analysis!.cashFlows[Math.min(holdYears - 1, deal.analysis!.cashFlows.length - 1)]?.loanBalance ?? 0;
    const saleProceeds = propertyValue * 0.94 - loanBalance; // 6% selling costs
    cumulativeCash += saleProceeds;

    // IRR approximation via XIRR-like calculation
    // Simple: use total return CAGR as proxy
    const totalReturn = (cumulativeCash / totalCash);
    const annualizedReturn = Math.pow(Math.max(0, 1 + totalReturn), 1 / holdYears) - 1;

    results.push({
      irr: annualizedReturn * 100,
      totalReturn: totalReturn * 100,
      finalValue: propertyValue,
    });
  }

  return results.sort((a, b) => a.irr - b.irr);
}

function buildHistogram(values: number[], bins = 20) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins;
  const hist = Array.from({ length: bins }, (_, i) => ({
    range: `${(min + i * width).toFixed(0)}%`,
    rangeVal: min + i * width,
    count: 0,
  }));
  values.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    hist[idx].count++;
  });
  return hist;
}

export function MonteCarloSimulation({ deal }: Props) {
  if (!deal.analysis) return null;

  const [holdYears, setHoldYears] = useState(10);
  const [runs] = useState(1000);

  const results = useMemo(() => runSimulations(deal, runs, holdYears), [deal, holdYears]);
  const irrs = results.map(r => r.irr);
  const histogram = buildHistogram(irrs);

  const p10 = irrs[Math.floor(runs * 0.10)];
  const p25 = irrs[Math.floor(runs * 0.25)];
  const p50 = irrs[Math.floor(runs * 0.50)];
  const p75 = irrs[Math.floor(runs * 0.75)];
  const p90 = irrs[Math.floor(runs * 0.90)];
  const pctPositive = (irrs.filter(r => r > 0).length / runs * 100).toFixed(0);
  const pctAbove8 = (irrs.filter(r => r > 8).length / runs * 100).toFixed(0);
  const pctAbove12 = (irrs.filter(r => r > 12).length / runs * 100).toFixed(0);
  const medianFinalValue = results[Math.floor(runs * 0.5)].finalValue;
  const price = deal.property.agreedPrice || deal.property.askingPrice;

  const maxCount = Math.max(...histogram.map(h => h.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-1">Monte Carlo Simulation</h3>
        <p className="text-sm text-slate-500">
          {runs.toLocaleString()} randomized scenarios varying rent growth, appreciation rate, and vacancy —
          shows the probability distribution of your returns.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Holding period</span>
          <span className="text-lg font-bold text-blue-600">{holdYears} years</span>
        </div>
        <input type="range" min={3} max={20} step={1} value={holdYears}
          onChange={e => setHoldYears(+e.target.value)}
          className="w-full accent-blue-500" />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>3yr</span><span>5yr</span><span>10yr</span><span>15yr</span><span>20yr</span>
        </div>
      </div>

      {/* Probability cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Positive return', pct: pctPositive, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'IRR > 8%', pct: pctAbove8, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'IRR > 12%', pct: pctAbove12, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 text-center ${c.bg}`}>
            <div className={`text-3xl font-bold ${c.color}`}>{c.pct}%</div>
            <div className="text-xs text-slate-500 mt-1">chance of {c.label}</div>
          </div>
        ))}
      </div>

      {/* Percentile table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">
          Return Distribution (Annualized IRR)
        </div>
        <div className="grid grid-cols-5 divide-x divide-slate-100">
          {[
            { label: 'Worst 10%', val: p10, color: 'text-red-600' },
            { label: 'Worst 25%', val: p25, color: 'text-orange-500' },
            { label: 'Median', val: p50, color: 'text-blue-600' },
            { label: 'Best 25%', val: p75, color: 'text-emerald-600' },
            { label: 'Best 10%', val: p90, color: 'text-emerald-700' },
          ].map(p => (
            <div key={p.label} className="p-4 text-center">
              <div className={`text-xl font-bold ${p.color}`}>{p.val.toFixed(1)}%</div>
              <div className="text-xs text-slate-400 mt-1">{p.label}</div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
          Median {holdYears}Y property value: <strong className="text-slate-700">{formatCurrency(medianFinalValue, 'BRL', true)}</strong>
          {' '}({((medianFinalValue / price - 1) * 100).toFixed(0)}% vs purchase price)
        </div>
      </div>

      {/* Histogram */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-4 text-sm">IRR Distribution across {runs} scenarios</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={histogram} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v} scenarios`, 'Count']} />
            <ReferenceLine x={histogram.find(h => h.rangeVal >= 0)?.range} stroke="#ef4444" strokeDasharray="4 4" />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {histogram.map((h, i) => (
                <Cell key={i} fill={h.rangeVal < 0 ? '#fca5a5' : h.rangeVal >= 12 ? '#10b981' : h.rangeVal >= 8 ? '#3b82f6' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-slate-400 mt-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-300 inline-block" /> Negative</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400 inline-block" /> 0–8%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500 inline-block" /> 8–12%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> 12%+</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Simulations use normally distributed random shocks around your assumptions.
        Not a guarantee of future performance. Past Brazilian real estate data: 1–3% real appreciation, 5–8% rental yields.
      </p>
    </div>
  );
}
