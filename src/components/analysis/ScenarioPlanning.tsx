'use client';

import { useState, useEffect } from 'react';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

interface Props {
  deal: Deal;
}

interface ScenarioConfig {
  name: string;
  color: string;
  icon: string;
  description: string;
  priceMult: number;
  rentMult: number;
  rateDelta: number;
  appreciation: number;
  vacancy: number; // -1 = use original
}

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'Pessimistic', color: '#ef4444', icon: '🐻',
    description: 'Higher price, lower rent, higher rate, slow appreciation',
    priceMult: 1.05, rentMult: 0.85, rateDelta: 2, appreciation: 4.0, vacancy: 10,
  },
  {
    name: 'Base Case', color: '#3b82f6', icon: '📊',
    description: 'Your assumptions as entered',
    priceMult: 1.0, rentMult: 1.0, rateDelta: 0, appreciation: -1, vacancy: -1,
  },
  {
    name: 'Optimistic', color: '#10b981', icon: '🐂',
    description: 'Negotiated discount, rent above market, fast appreciation',
    priceMult: 0.93, rentMult: 1.15, rateDelta: -1, appreciation: 9.0, vacancy: 3,
  },
];

interface ScenarioResult {
  netYield: number;
  capRate: number;
  irr10: number;
  cagr10: number;
  score: number;
  rating: string;
  monthlyCF: number;
  totalReturn10: number;
  projValue10: number;
}

function applyScenario(deal: Deal, sc: ScenarioConfig): Deal {
  const d = JSON.parse(JSON.stringify(deal)) as Deal;
  const origPrice = d.property.agreedPrice || d.property.askingPrice;
  const newPrice = origPrice * sc.priceMult;
  d.property.askingPrice = newPrice;
  d.property.agreedPrice = newPrice;
  if (d.financing.financingType !== 'cash') {
    const dpPct = d.financing.downPaymentPercent / 100;
    d.financing.downPaymentAmount = newPrice * dpPct;
    d.financing.loanAmount = newPrice * (1 - dpPct);
  }
  d.rentalAssumptions.ltr.monthlyRent = Math.max(100, d.rentalAssumptions.ltr.monthlyRent * sc.rentMult);
  d.financing.interestRate = Math.max(1, d.financing.interestRate + sc.rateDelta);
  if (sc.vacancy >= 0) d.rentalAssumptions.ltr.vacancyRatePercent = sc.vacancy;
  if (sc.appreciation >= 0) d.userOverrides.appreciationRateOverride = sc.appreciation;
  return d;
}

function extractResult(analysis: DealAnalysis): ScenarioResult {
  const yr10 = analysis.returns.projections.find((p) => p.years === 10);
  return {
    netYield: analysis.returns.netYield,
    capRate: analysis.returns.capRate,
    irr10: yr10?.irr ?? 0,
    cagr10: yr10?.annualizedReturn ?? 0,
    score: analysis.dealScore.total,
    rating: analysis.dealScore.rating,
    monthlyCF: (analysis.cashFlows[0]?.cashFlow ?? 0) / 12,
    totalReturn10: yr10?.totalReturn ?? 0,
    projValue10: yr10?.projectedValue ?? 0,
  };
}

export function ScenarioPlanning({ deal }: Props) {
  const [results, setResults] = useState<(ScenarioResult | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const out: (ScenarioResult | null)[] = [null, null, null];
      await Promise.all(SCENARIOS.map(async (sc, i) => {
        try {
          const modDeal = applyScenario(deal, sc);
          const res = await fetch('/api/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deal: modDeal }),
          });
          if (res.ok) {
            const data = await res.json();
            out[i] = extractResult(data.analysis);
          }
        } catch { /* skip */ }
      }));
      if (!cancelled) { setResults(out); setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [deal.id]); // Only re-run if deal ID changes

  const yieldData = SCENARIOS.map((sc, i) => ({
    name: sc.name,
    'Net Yield': parseFloat((results[i]?.netYield ?? 0).toFixed(2)),
    'Cap Rate': parseFloat((results[i]?.capRate ?? 0).toFixed(2)),
  }));
  const returnData = SCENARIOS.map((sc, i) => ({
    name: sc.name,
    '10Y IRR': parseFloat((results[i]?.irr10 ?? 0).toFixed(1)),
    '10Y CAGR': parseFloat((results[i]?.cagr10 ?? 0).toFixed(1)),
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-sm">Running 3 scenarios…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-700">Scenario Planning</h3>
        <p className="text-xs text-slate-400 mt-0.5">Pessimistic / Base / Optimistic side-by-side</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SCENARIOS.map((sc, i) => {
          const r = results[i];
          if (!r) return <div key={sc.name} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse h-48" />;
          return (
            <div key={sc.name} className="bg-white rounded-xl p-5 border-2 space-y-3" style={{ borderColor: sc.color + '40' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{sc.icon}</span>
                <div>
                  <div className="font-semibold text-slate-800">{sc.name}</div>
                  <div className="text-xs text-slate-500">{sc.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${r.score}%`, backgroundColor: sc.color }} />
                </div>
                <span className="text-sm font-bold" style={{ color: sc.color }}>{r.score}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
                {[
                  { label: 'Net Yield', val: formatPercent(r.netYield) },
                  { label: 'Cap Rate', val: formatPercent(r.capRate) },
                  { label: '10Y IRR', val: formatPercent(r.irr10) },
                  { label: 'Monthly CF', val: formatCurrency(r.monthlyCF, 'BRL'), isNeg: r.monthlyCF < 0 },
                  { label: '10Y Value', val: formatCurrency(r.projValue10, 'BRL', true) },
                  { label: '10Y Return', val: `${r.totalReturn10.toFixed(0)}%` },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-xs text-slate-400">{m.label}</div>
                    <div className={`font-semibold ${m.isNeg ? 'text-red-600' : ''}`} style={{ color: m.isNeg ? undefined : sc.color }}>
                      {m.val}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 space-y-0.5">
                <div>Apprec: {sc.appreciation >= 0 ? `${sc.appreciation}%` : 'base'}/yr · Rate delta: {sc.rateDelta > 0 ? '+' : ''}{sc.rateDelta}pp</div>
                <div>Price: {((sc.priceMult - 1) * 100).toFixed(0) !== '0' ? `${sc.priceMult > 1 ? '+' : ''}${((sc.priceMult - 1) * 100).toFixed(0)}%` : 'base'} · Rent: {((sc.rentMult - 1) * 100).toFixed(0) !== '0' ? `${sc.rentMult > 1 ? '+' : ''}${((sc.rentMult - 1) * 100).toFixed(0)}%` : 'base'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-600 mb-3">Yield Comparison</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Net Yield" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Cap Rate" fill="#93c5fd" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-600 mb-3">10-Year Returns</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={returnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="10Y IRR" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="10Y CAGR" fill="#6ee7b7" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
