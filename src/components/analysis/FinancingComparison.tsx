'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { Check, Star, Pencil } from 'lucide-react';

interface Props {
  deal: Deal;
}

interface Scenario {
  id: string;
  label: string;
  sublabel: string;
  highlight?: boolean;
  downPct: number;
  rate: number;   // annual %
  termYears: number;
  editable?: boolean;
}

function calcPRICEMonthly(loan: number, annualRate: number, years: number): number {
  if (loan <= 0 || annualRate <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcSACFirst(loan: number, annualRate: number, years: number): number {
  if (loan <= 0 || annualRate <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return loan / n + loan * r;
}

function calcTotalInterestSAC(loan: number, annualRate: number, years: number): number {
  if (loan <= 0 || annualRate <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  // SAC: total interest = L * r * (n+1) / 2
  return loan * r * (n + 1) / 2;
}

export function FinancingComparison({ deal }: Props) {
  const analysis = deal.analysis!;
  const price = deal.property.agreedPrice || deal.property.askingPrice;

  // Custom scenario state
  const [customDown, setCustomDown] = useState(25);
  const [customRate, setCustomRate] = useState(11.49);
  const [customTerm, setCustomTerm] = useState(20);

  const DEFAULT_SCENARIOS: Scenario[] = [
    { id: 'cash',    label: '💵 Cash',         sublabel: 'Full payment, no debt',    downPct: 100, rate: 0,     termYears: 0 },
    { id: 'caixa',   label: '🏦 Caixa SAC',    sublabel: '20% down · 10.99% · 25yr', highlight: true, downPct: 20, rate: 10.99, termYears: 25 },
    { id: 'private', label: '🏛️ Private Bank', sublabel: '30% down · 11.49% · 20yr', downPct: 30, rate: 11.49, termYears: 20 },
    { id: 'custom',  label: '✏️ Custom',        sublabel: 'Your scenario',            downPct: customDown, rate: customRate, termYears: customTerm, editable: true },
  ];

  // Gross monthly rent (from recommended strategy)
  const strategy = deal.rentalAssumptions.strategy;
  const grossMonthlyRent = strategy === 'short-term'
    ? analysis.rentalAnalysis.str.grossAnnualRevenue / 12
    : analysis.rentalAnalysis.ltr.grossAnnualIncome / 12;

  // Monthly operating costs (fixed, same across all scenarios)
  const monthlyOpCosts = analysis.annualCosts.total / 12;

  // Transaction costs (excluding down payment — ITBI, cartório, legal, etc.)
  const transactionCosts = analysis.purchaseCosts.totalTransactionCosts;

  // Current deal financing (for highlight)
  const currentFinType = deal.financing.financingType;
  const currentMatchId = currentFinType === 'cash' ? 'cash'
    : currentFinType === 'caixa' ? 'caixa'
    : currentFinType === 'private-bank' ? 'private'
    : null;

  const scenarios = DEFAULT_SCENARIOS.map(s =>
    s.id === 'custom'
      ? { ...s, downPct: customDown, rate: customRate, termYears: customTerm }
      : s
  );

  type Computed = {
    downAmount: number;
    loanAmount: number;
    monthlyMortgage: number;
    totalInterest: number;
    totalCashRequired: number;
    monthlyCF: number;
    annualCF: number;
    cocReturn: number;
    dscr: number;
    ltv: number;
  };

  function compute(s: Scenario): Computed {
    const downAmount = price * (s.downPct / 100);
    const loanAmount = price - downAmount;
    const monthlyMortgage = s.id === 'cash' ? 0 : calcSACFirst(loanAmount, s.rate, s.termYears);
    const totalInterest = s.id === 'cash' ? 0 : calcTotalInterestSAC(loanAmount, s.rate, s.termYears);
    const totalCashRequired = downAmount + transactionCosts;
    const vacancyFactor = 1 - (deal.rentalAssumptions.ltr.vacancyRatePercent / 100);
    const effectiveRent = grossMonthlyRent * vacancyFactor;
    const monthlyCF = effectiveRent - monthlyMortgage - monthlyOpCosts;
    const annualCF = monthlyCF * 12;
    const cocReturn = totalCashRequired > 0 ? (annualCF / totalCashRequired) * 100 : 0;
    const annualNOI = (effectiveRent - monthlyOpCosts) * 12;
    const annualMortgage = monthlyMortgage * 12;
    const dscr = annualMortgage > 0 ? annualNOI / annualMortgage : 999;
    const ltv = price > 0 ? (loanAmount / price) * 100 : 0;
    return { downAmount, loanAmount, monthlyMortgage, totalInterest, totalCashRequired, monthlyCF, annualCF, cocReturn, dscr, ltv };
  }

  const computed = scenarios.map(s => compute(s));

  // Find best CoC scenario
  const bestCoCIdx = computed.reduce((best, c, i) => c.cocReturn > computed[best].cocReturn ? i : best, 0);

  const ROW_LABEL = 'text-xs text-slate-500 font-medium';
  const VAL = 'text-sm font-semibold text-slate-800 text-right';
  const VAL_POS = 'text-sm font-semibold text-emerald-600 text-right';
  const VAL_NEG = 'text-sm font-semibold text-red-600 text-right';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Financing Comparison</h2>
        <p className="text-sm text-slate-500 mt-1">
          Same property, different financing structures — impact on cash flow and returns.
        </p>
      </div>

      {/* Custom scenario inputs */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Pencil className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Custom Scenario</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Down payment %</label>
            <div className="relative">
              <input
                type="number" min="10" max="100" step="5"
                value={customDown}
                onChange={e => setCustomDown(parseFloat(e.target.value) || 10)}
                className="w-full border border-slate-300 rounded-lg px-3 pr-7 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Interest rate (% / yr)</label>
            <div className="relative">
              <input
                type="number" min="1" max="30" step="0.1"
                value={customRate}
                onChange={e => setCustomRate(parseFloat(e.target.value) || 1)}
                className="w-full border border-slate-300 rounded-lg px-3 pr-7 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Term (years)</label>
            <select
              value={customTerm}
              onChange={e => setCustomTerm(parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 15, 20, 25, 30, 35].map(y => <option key={y} value={y}>{y}y</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((s, i) => {
          const c = computed[i];
          const isCurrent = s.id === currentMatchId;
          const isBestCoC = i === bestCoCIdx;
          return (
            <div
              key={s.id}
              className={`rounded-xl border-2 p-4 flex flex-col gap-3 relative ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50/40'
                  : s.highlight
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Your deal
                </span>
              )}
              {isBestCoC && !isCurrent && (
                <span className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Best CoC
                </span>
              )}
              <div>
                <div className="font-bold text-slate-800 text-sm leading-tight">{s.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{s.sublabel}</div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between items-center">
                  <span className={ROW_LABEL}>Down payment</span>
                  <span className={VAL}>{formatCurrency(c.downAmount, 'BRL', true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={ROW_LABEL}>Down %</span>
                  <span className={VAL}>{s.downPct.toFixed(0)}%</span>
                </div>
                {s.id !== 'cash' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className={ROW_LABEL}>Loan amount</span>
                      <span className={VAL}>{formatCurrency(c.loanAmount, 'BRL', true)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={ROW_LABEL}>LTV</span>
                      <span className={`text-sm font-semibold text-right ${c.ltv > 80 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {c.ltv.toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-100 pt-1.5 mt-1.5" />
                <div className="flex justify-between items-center">
                  <span className={ROW_LABEL}>Cash required</span>
                  <span className={VAL}>{formatCurrency(c.totalCashRequired, 'BRL', true)}</span>
                </div>
                {s.id !== 'cash' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className={ROW_LABEL}>Monthly payment</span>
                      <span className="text-sm font-semibold text-orange-700 text-right">{formatCurrency(c.monthlyMortgage, 'BRL')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={ROW_LABEL}>Total interest</span>
                      <span className="text-sm font-semibold text-red-600 text-right">{formatCurrency(c.totalInterest, 'BRL', true)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-100 pt-1.5 mt-1.5" />
                <div className="flex justify-between items-center">
                  <span className={ROW_LABEL}>Monthly CF</span>
                  <span className={c.monthlyCF >= 0 ? VAL_POS : VAL_NEG}>
                    {c.monthlyCF >= 0 ? '+' : ''}{formatCurrency(c.monthlyCF, 'BRL')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={ROW_LABEL}>Annual CF</span>
                  <span className={c.annualCF >= 0 ? VAL_POS : VAL_NEG}>
                    {c.annualCF >= 0 ? '+' : ''}{formatCurrency(c.annualCF, 'BRL')}
                  </span>
                </div>
              </div>

              {/* CoC highlight */}
              <div className={`rounded-lg px-3 py-2.5 text-center ${
                isBestCoC ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className={`text-lg font-bold ${
                  c.cocReturn >= 6 ? 'text-emerald-600' : c.cocReturn >= 0 ? 'text-slate-700' : 'text-red-600'
                }`}>
                  {c.cocReturn >= 0 ? '+' : ''}{c.cocReturn.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Cash-on-Cash</div>
              </div>

              {s.id !== 'cash' && (
                <div className={`rounded-lg px-3 py-1.5 text-center border ${
                  c.dscr >= 1.2 ? 'bg-emerald-50 border-emerald-200' : c.dscr >= 1.0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`text-sm font-bold ${
                    c.dscr >= 1.2 ? 'text-emerald-700' : c.dscr >= 1.0 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {c.dscr > 10 ? '∞' : c.dscr.toFixed(2)}x
                  </div>
                  <div className="text-[10px] text-slate-500">DSCR</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delta summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">ΔCash Flow vs Cash Purchase</h3>
        <div className="space-y-2">
          {scenarios.slice(1).map((s, i) => {
            const c = computed[i + 1];
            const cashCF = computed[0].annualCF;
            const delta = c.annualCF - cashCF;
            const deltaCoC = c.cocReturn - computed[0].cocReturn;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-36 flex-shrink-0">{s.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${delta >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, Math.abs(delta) / (Math.abs(cashCF) + 1) * 100 * 2)}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold w-28 text-right ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? '+' : ''}{formatCurrency(delta, 'BRL')}/yr
                </span>
                <span className={`text-xs w-16 text-right ${deltaCoC >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {deltaCoC >= 0 ? '+' : ''}{deltaCoC.toFixed(1)}% CoC
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assumptions note */}
      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-3 leading-relaxed">
        <span className="font-semibold text-slate-500">Assumptions:</span> SAC amortization (first payment shown).
        Monthly CF = effective rent × (1 − vacancy) − mortgage − operating costs.
        Operating costs ({formatCurrency(analysis.annualCosts.total / 12, 'BRL')}/mo) are fixed across scenarios.
        Transaction costs ({formatCurrency(transactionCosts, 'BRL', true)}) added to cash required in all cases.
        DSCR = Net Operating Income ÷ Annual Debt Service. DSCR &gt; 1.2× is considered healthy.
      </div>
    </div>
  );
}
