'use client';

import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor } from '@/lib/utils/formatters';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  deals: Deal[];
  onBack: () => void;
  onSelectDeal: (deal: Deal) => void;
}

interface Metric {
  label: string;
  category: string;
  getValue: (d: Deal) => number | null;
  format: (v: number) => string;
  higherIsBetter: boolean;
  threshold?: { good: number; bad: number };
}

const METRICS: Metric[] = [
  // Price
  { label: 'Purchase Price', category: 'Property', getValue: d => d.property.agreedPrice || d.property.askingPrice, format: v => formatCurrency(v, 'BRL', true), higherIsBetter: false },
  { label: 'Price / m²', category: 'Property', getValue: d => d.analysis ? d.analysis.returns.pricePerSqm : null, format: v => `${formatCurrency(v, 'BRL')}/m²`, higherIsBetter: false },
  { label: 'vs Market', category: 'Property', getValue: d => d.analysis?.marketContext.priceVsMarketPercent ?? null, format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, higherIsBetter: false },
  // Yield
  { label: 'Gross Yield', category: 'Returns', getValue: d => d.analysis?.returns.grossYield ?? null, format: v => formatPercent(v), higherIsBetter: true, threshold: { good: 6, bad: 4 } },
  { label: 'Net Yield', category: 'Returns', getValue: d => d.analysis?.returns.netYield ?? null, format: v => formatPercent(v), higherIsBetter: true, threshold: { good: 4, bad: 2.5 } },
  { label: 'Cap Rate', category: 'Returns', getValue: d => d.analysis?.returns.capRate ?? null, format: v => formatPercent(v), higherIsBetter: true, threshold: { good: 4, bad: 2.5 } },
  { label: 'Cash-on-Cash Y1', category: 'Returns', getValue: d => d.analysis?.returns.cashOnCashReturn ?? null, format: v => formatPercent(v), higherIsBetter: true, threshold: { good: 0, bad: -5 } },
  // Long-term
  { label: '10Y IRR', category: 'Long-Term', getValue: d => d.analysis?.returns.projections.find(p => p.years === 10)?.irr ?? null, format: v => formatPercent(v), higherIsBetter: true, threshold: { good: 12, bad: 7 } },
  { label: '10Y CAGR', category: 'Long-Term', getValue: d => d.analysis?.returns.projections.find(p => p.years === 10)?.annualizedReturn ?? null, format: v => formatPercent(v), higherIsBetter: true },
  { label: '10Y Value', category: 'Long-Term', getValue: d => d.analysis?.returns.projections.find(p => p.years === 10)?.projectedValue ?? null, format: v => formatCurrency(v, 'BRL', true), higherIsBetter: true },
  // Cash flow
  { label: 'Monthly CF (Y1)', category: 'Cash Flow', getValue: d => d.analysis ? (d.analysis.cashFlows[0]?.cashFlow ?? 0) / 12 : null, format: v => formatCurrency(v, 'BRL'), higherIsBetter: true, threshold: { good: 0, bad: -500 } },
  { label: 'Monthly Rent', category: 'Cash Flow', getValue: d => d.rentalAssumptions.ltr.monthlyRent, format: v => formatCurrency(v, 'BRL'), higherIsBetter: true },
  // Score
  { label: 'Deal Score', category: 'Overall', getValue: d => d.analysis?.dealScore.total ?? null, format: v => `${v.toFixed(0)}/100`, higherIsBetter: true, threshold: { good: 65, bad: 45 } },
  { label: 'Risk Factors', category: 'Overall', getValue: d => d.analysis?.riskFactors.filter(r => r.severity === 'high').length ?? null, format: v => `${v} high`, higherIsBetter: false, threshold: { good: 0, bad: 2 } },
  // Costs
  { label: 'Total Cash Required', category: 'Costs', getValue: d => d.analysis?.purchaseCosts.totalCashRequired ?? null, format: v => formatCurrency(v, 'BRL', true), higherIsBetter: false },
  { label: 'ITBI', category: 'Costs', getValue: d => d.analysis?.purchaseCosts.itbi ?? null, format: v => formatCurrency(v, 'BRL'), higherIsBetter: false },
  { label: 'Annual Costs', category: 'Costs', getValue: d => d.analysis?.annualCosts.total ?? null, format: v => formatCurrency(v, 'BRL'), higherIsBetter: false },
];

const CATEGORIES = ['Overall', 'Returns', 'Cash Flow', 'Long-Term', 'Property', 'Costs'];

function getBestIndex(values: (number | null)[], higherIsBetter: boolean): number {
  const valid = values.map((v, i) => ({ v, i })).filter(x => x.v !== null);
  if (valid.length < 2) return -1;
  return valid.reduce((best, cur) =>
    higherIsBetter ? (cur.v! > best.v! ? cur : best) : (cur.v! < best.v! ? cur : best)
  ).i;
}

function MetricColor({ value, threshold, higherIsBetter }: { value: number; threshold?: { good: number; bad: number }; higherIsBetter: boolean }) {
  if (!threshold) return null;
  const isGood = higherIsBetter ? value >= threshold.good : value <= threshold.good;
  const isBad = higherIsBetter ? value <= threshold.bad : value >= threshold.bad;
  if (isGood) return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block ml-1" />;
  if (isBad) return <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block ml-1" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block ml-1" />;
}

export function DealComparison({ deals, onBack, onSelectDeal }: Props) {
  const analyzedDeals = deals.filter(d => d.analysis);

  if (analyzedDeals.length < 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-slate-600 font-medium">Need at least 2 analyzed deals to compare</p>
          <button onClick={onBack} className="mt-4 text-blue-500 hover:underline text-sm">← Back</button>
        </div>
      </div>
    );
  }

  const displayDeals = analyzedDeals.slice(0, 3);

  // Count wins per deal
  const wins = displayDeals.map(() => 0);
  METRICS.forEach(m => {
    const values = displayDeals.map(d => m.getValue(d));
    const best = getBestIndex(values, m.higherIsBetter);
    if (best >= 0) wins[best]++;
  });
  const overallWinner = wins.indexOf(Math.max(...wins));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800">Deal Comparison</span>
          <span className="text-xs text-slate-400">Comparing {displayDeals.length} deals</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Deal headers */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${displayDeals.length}, 1fr)` }}>
          <div />
          {displayDeals.map((deal, i) => {
            const price = deal.property.agreedPrice || deal.property.askingPrice;
            const isWinner = i === overallWinner;
            return (
              <div key={deal.id}
                className={`rounded-xl p-4 border-2 cursor-pointer hover:shadow-md transition-all ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white'}`}
                onClick={() => onSelectDeal(deal)}
              >
                {isWinner && (
                  <div className="flex items-center gap-1 text-xs font-bold text-yellow-700 mb-2">
                    <Trophy className="w-3.5 h-3.5" /> Best Overall
                  </div>
                )}
                <div className="font-semibold text-slate-800 text-sm truncate">{deal.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}{deal.property.city}
                </div>
                <div className="text-xs text-slate-500">{deal.property.rooms}BR · {deal.property.sizeSqm}m²</div>
                <div className="mt-2 font-bold text-slate-800">{formatCurrency(price, 'BRL', true)}</div>
                {deal.analysis && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${deal.analysis.dealScore.total}%`, backgroundColor: COLORS[i] }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: COLORS[i] }}>{deal.analysis.dealScore.total}/100</span>
                  </div>
                )}
                <div className="mt-1 text-xs font-medium" style={{ color: COLORS[i] }}>
                  {wins[i]} wins · <span className={getRatingColor(deal.analysis!.dealScore.rating)}>{deal.analysis!.dealScore.rating}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Metrics by category */}
        {CATEGORIES.map(category => {
          const catMetrics = METRICS.filter(m => m.category === category);
          return (
            <div key={category}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{category}</h3>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {catMetrics.map((metric, mi) => {
                  const values = displayDeals.map(d => metric.getValue(d));
                  const bestIdx = getBestIndex(values, metric.higherIsBetter);
                  return (
                    <div key={metric.label}
                      className={`grid items-center ${mi < catMetrics.length - 1 ? 'border-b border-slate-100' : ''}`}
                      style={{ gridTemplateColumns: `200px repeat(${displayDeals.length}, 1fr)` }}
                    >
                      <div className="px-4 py-3 text-sm text-slate-600 font-medium">{metric.label}</div>
                      {displayDeals.map((deal, i) => {
                        const val = values[i];
                        const isBest = i === bestIdx;
                        return (
                          <div key={deal.id} className={`px-4 py-3 text-sm text-right ${isBest ? 'font-bold' : 'text-slate-600'}`}
                            style={{ color: isBest ? COLORS[i] : undefined }}>
                            {val === null ? <span className="text-slate-300">—</span> : (
                              <span className="flex items-center justify-end gap-1">
                                {isBest && (
                                  metric.higherIsBetter
                                    ? <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                    : <TrendingDown className="w-3 h-3 flex-shrink-0" />
                                )}
                                {metric.format(val)}
                                <MetricColor value={val} threshold={metric.threshold} higherIsBetter={metric.higherIsBetter} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-slate-400 text-center">Click any deal card to open its full dashboard</p>
      </div>
    </div>
  );
}
