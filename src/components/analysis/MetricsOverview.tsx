'use client';

import { useState } from 'react';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { BRAZIL_SELIC_RATE } from '@/lib/constants/countries';

type DisplayCurrency = 'BRL' | 'USD' | 'ILS';

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

function useCurrencyConvert(rates: Record<string, number>) {
  const [currency, setCurrency] = useState<DisplayCurrency>('BRL');
  const usdRate = rates.USD ?? 0.18;
  const ilsRate = rates.ILS ?? 0.65; // fallback ≈ BRL→ILS

  const convert = (brl: number): string => {
    if (currency === 'BRL') return formatCurrency(brl, 'BRL');
    if (currency === 'USD') return `$${(brl * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `₪${(brl * ilsRate).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
  };

  const convertLarge = (brl: number): string => {
    if (currency === 'BRL') return formatCurrency(brl, 'BRL', true);
    if (currency === 'USD') {
      const v = brl * usdRate;
      return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
    }
    const v = brl * ilsRate;
    return v >= 1_000_000 ? `₪${(v / 1_000_000).toFixed(1)}M` : `₪${(v / 1000).toFixed(0)}K`;
  };

  return { currency, setCurrency, convert, convertLarge };
}

export function MetricsOverview({ deal, analysis }: Props) {
  const { returns, dealScore, marketContext, financing } = analysis;
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { currency, setCurrency, convert, convertLarge } = useCurrencyConvert(marketContext.exchangeRates);

  const yr10 = returns.projections.find((p) => p.years === 10);
  const yr5 = returns.projections.find((p) => p.years === 5);

  return (
    <div className="space-y-6">
      {/* Currency toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
          {(['BRL', 'USD', 'ILS'] as DisplayCurrency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${currency === c ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {c === 'BRL' ? 'R$' : c === 'USD' ? '$' : '₪'} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Deal verdict */}
      <div className={`border rounded-2xl p-6 ${getRatingBg(dealScore.rating)}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">Deal Verdict</div>
            <div className={`text-3xl font-bold ${getRatingColor(dealScore.rating)}`}>
              {dealScore.recommendation.replace('-', ' ').toUpperCase()}
            </div>
            <div className="text-slate-600 mt-1">Score: {dealScore.total}/100 · {dealScore.rating}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Score breakdown</div>
            <div className="space-y-0.5 mt-1 text-sm">
              <ScoreRow label="Yield" score={dealScore.breakdown.yield} max={25} />
              <ScoreRow label="Cash Flow" score={dealScore.breakdown.cashFlow} max={25} />
              <ScoreRow label="Appreciation" score={dealScore.breakdown.appreciation} max={20} />
              <ScoreRow label="Risk" score={dealScore.breakdown.risk} max={15} />
              <ScoreRow label="Market" score={dealScore.breakdown.marketTiming} max={15} />
            </div>
          </div>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Gross Yield"
          value={formatPercent(returns.grossYield)}
          subtext={`Market avg: ~${marketContext.avgYieldArea}%`}
          color={returns.grossYield >= marketContext.avgYieldArea ? 'green' : 'orange'}
        />
        <MetricCard
          label="Net Yield"
          value={formatPercent(returns.netYield)}
          subtext="After all costs"
          color={returns.netYield >= 4 ? 'green' : 'orange'}
        />
        <MetricCard
          label="Cap Rate"
          value={formatPercent(returns.capRate)}
          subtext={`Real: ${formatPercent(returns.realCapRate)}`}
          color={returns.capRate >= 4 ? 'green' : 'orange'}
        />
        <MetricCard
          label="Cash-on-Cash"
          value={formatPercent(returns.cashOnCashReturn)}
          subtext="Year 1"
          color={returns.cashOnCashReturn >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Price per m²"
          value={formatCurrency(returns.pricePerSqm, 'BRL')}
          subtext={`Market: ${formatCurrency(marketContext.avgPricePerSqmArea, 'BRL')}/m²`}
          color="neutral"
        />
        <MetricCard
          label="Payback Period"
          value={`${returns.paybackYears}y`}
          subtext="Cash break-even"
          color={returns.paybackYears < 15 ? 'green' : returns.paybackYears < 25 ? 'orange' : 'red'}
        />
        <MetricCard
          label="10-Year IRR"
          value={yr10 ? formatPercent(yr10.irr) : '—'}
          subtext="Internal rate of return"
          color={yr10 && yr10.irr >= BRAZIL_SELIC_RATE ? 'green' : 'orange'}
        />
        <MetricCard
          label="10-Year CAGR"
          value={yr10 ? formatPercent(yr10.annualizedReturn) : '—'}
          subtext="Annualized total return"
          color="neutral"
        />
      </div>

      {/* Financing summary */}
      {financing.monthlyPayment > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Financing Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Monthly Payment</div>
              <div className="font-semibold text-slate-800">{formatCurrency(financing.monthlyPayment, 'BRL')}</div>
            </div>
            <div>
              <div className="text-slate-500">Total Interest</div>
              <div className="font-semibold text-slate-800">{formatCurrency(financing.totalInterest, 'BRL')}</div>
            </div>
            <div>
              <div className="text-slate-500">Rate</div>
              <div className="font-semibold text-slate-800">{financing.effectiveRate}%/year</div>
            </div>
            <div>
              <div className="text-slate-500">System</div>
              <div className="font-semibold text-slate-800">{financing.amortizationType.split(' ')[0]}</div>
            </div>
          </div>
        </div>
      )}

      {/* 5y / 10y projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[yr5, yr10].filter(Boolean).map((proj) => proj && (
          <div key={proj.years} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-3">{proj.years}-Year Projection</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Projected Value</div>
                <div className="font-semibold">{convertLarge(proj.projectedValue)}</div>
              </div>
              <div>
                <div className="text-slate-500">Equity Built</div>
                <div className="font-semibold">{convertLarge(proj.equityBuilt)}</div>
              </div>
              <div>
                <div className="text-slate-500">Total Cash Flow</div>
                <div className={`font-semibold ${proj.totalCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertLarge(proj.totalCashFlow)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Total Return</div>
                <div className={`font-semibold text-lg ${proj.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {proj.totalReturn >= 0 ? '+' : ''}{proj.totalReturn.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Market context */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Market Context (Brazil 2025)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Selic Rate</div>
            <div className="font-semibold text-slate-800">{marketContext.selicRate}%</div>
            <div className="text-xs text-slate-400">Benchmark rate</div>
          </div>
          <div>
            <div className="text-slate-500">IPCA Inflation</div>
            <div className="font-semibold text-slate-800">{marketContext.inflationRate}%</div>
            <div className="text-xs text-slate-400">Annual target</div>
          </div>
          <div>
            <div className="text-slate-500">USD/BRL</div>
            <div className="font-semibold text-slate-800">
              R${(1 / (marketContext.exchangeRates.USD ?? 0.18)).toFixed(2)}
            </div>
            <div className="text-xs text-slate-400">
              Price ≈ {convertLarge(price)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Real Cap Rate</div>
            <div className={`font-semibold ${returns.realCapRate > 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatPercent(returns.realCapRate)}
            </div>
            <div className="text-xs text-slate-400">Inflation-adjusted</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, subtext, color,
}: {
  label: string; value: string; subtext?: string; color: 'green' | 'orange' | 'red' | 'neutral';
}) {
  const valueColor =
    color === 'green' ? 'text-emerald-700' :
    color === 'orange' ? 'text-amber-700' :
    color === 'red' ? 'text-red-700' :
    'text-slate-800';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 w-20 text-right">{label}</span>
      <div className="w-20 bg-slate-200 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full"
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      <span className="text-slate-700 font-medium w-10">{score}/{max}</span>
    </div>
  );
}
