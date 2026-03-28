'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface Props {
  deal: Deal;
}

export function NegotiationPanel({ deal }: Props) {
  const { analysis, property, rentalAssumptions } = deal;
  if (!analysis) return null;

  const originalPrice = property.agreedPrice || property.askingPrice;
  const [discountPct, setDiscountPct] = useState(0);

  const negotiatedPrice = originalPrice * (1 - discountPct / 100);
  const saving = originalPrice - negotiatedPrice;

  // Recalculate key metrics at new price (approximate — no full re-run)
  const totalCashOrig = analysis.purchaseCosts.totalCashRequired;
  const transactionCosts = analysis.purchaseCosts.totalTransactionCosts - originalPrice;
  const newTotalCash = negotiatedPrice + transactionCosts;

  const annualRent = rentalAssumptions.ltr.monthlyRent * 12;
  const newGrossYield = annualRent > 0 ? (annualRent / negotiatedPrice) * 100 : 0;
  const costRatio = analysis.annualCosts.total / originalPrice;
  const newNOI = annualRent - (analysis.annualCosts.total + costRatio * (negotiatedPrice - originalPrice));
  const newNetYield = negotiatedPrice > 0 ? (newNOI / negotiatedPrice) * 100 : 0;
  const newCapRate = newNetYield;
  const annualDebtService = analysis.financing.monthlyPayment * 12;
  const newCashOnCash = newTotalCash > 0 ? ((newNOI - annualDebtService) / newTotalCash) * 100 : 0;
  const newPricePerSqm = property.sizeSqm > 0 ? negotiatedPrice / property.sizeSqm : 0;

  const delta = (newVal: number, origVal: number, higherBetter = true) => {
    const diff = newVal - origVal;
    const pct = origVal !== 0 ? (diff / Math.abs(origVal)) * 100 : 0;
    const positive = higherBetter ? diff > 0 : diff < 0;
    if (Math.abs(diff) < 0.01) return null;
    return { pct, positive, label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` };
  };

  const metrics = [
    { label: 'Negotiated Price', orig: formatCurrency(originalPrice, 'BRL', true), newVal: formatCurrency(negotiatedPrice, 'BRL', true), d: delta(negotiatedPrice, originalPrice, false) },
    { label: 'Total Cash Required', orig: formatCurrency(totalCashOrig, 'BRL', true), newVal: formatCurrency(newTotalCash, 'BRL', true), d: delta(newTotalCash, totalCashOrig, false) },
    { label: 'Price / m²', orig: formatCurrency(analysis.returns.pricePerSqm, 'BRL') + '/m²', newVal: formatCurrency(newPricePerSqm, 'BRL') + '/m²', d: delta(newPricePerSqm, analysis.returns.pricePerSqm, false) },
    { label: 'Gross Yield', orig: formatPercent(analysis.returns.grossYield), newVal: formatPercent(newGrossYield), d: delta(newGrossYield, analysis.returns.grossYield, true) },
    { label: 'Net Yield', orig: formatPercent(analysis.returns.netYield), newVal: formatPercent(newNetYield), d: delta(newNetYield, analysis.returns.netYield, true) },
    { label: 'Cap Rate', orig: formatPercent(analysis.returns.capRate), newVal: formatPercent(newCapRate), d: delta(newCapRate, analysis.returns.capRate, true) },
    { label: 'Cash-on-Cash (Y1)', orig: formatPercent(analysis.returns.cashOnCashReturn), newVal: formatPercent(newCashOnCash), d: delta(newCashOnCash, analysis.returns.cashOnCashReturn, true) },
  ];

  return (
    <div className="space-y-6">
      {/* Slider */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Price Negotiation Simulator</h3>
        <p className="text-sm text-slate-500 mb-5">Adjust the discount to see how it impacts all key metrics in real time.</p>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-500">Discount from asking price</span>
          <span className="text-2xl font-bold text-blue-600">{discountPct}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={discountPct}
          onChange={(e) => setDiscountPct(parseFloat(e.target.value))}
          className="w-full accent-blue-500 h-2"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0% (asking)</span>
          <span>5%</span>
          <span>10%</span>
          <span>15%</span>
          <span>20%</span>
        </div>

        {discountPct > 0 && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-emerald-700">You save</span>
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(saving, 'BRL', true)}</span>
          </div>
        )}
      </div>

      {/* Metrics comparison table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 px-4 py-3">
          <span>Metric</span>
          <span className="text-right">Current</span>
          <span className="text-right text-blue-600">At {discountPct}% off</span>
          <span className="text-right">Change</span>
        </div>
        {metrics.map((m) => (
          <div key={m.label} className="grid grid-cols-4 items-center px-4 py-3 border-b border-slate-50 last:border-0 text-sm">
            <span className="text-slate-600 font-medium">{m.label}</span>
            <span className="text-right text-slate-500">{m.orig}</span>
            <span className="text-right font-semibold text-blue-700">{m.newVal}</span>
            <span className="text-right">
              {m.d ? (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${m.d.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {m.d.label}
                </span>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Negotiation tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h4 className="font-semibold text-blue-800 mb-3">🤝 Negotiation Tips for Brazil</h4>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>• <strong>5-10% discount</strong> is typical in most markets. More than 15% requires strong justification (condition issues, overpriced listing, seller urgency).</li>
          <li>• <strong>Time on market:</strong> Properties listed 90+ days have more room. Ask the broker how long it has been listed.</li>
          <li>• <strong>Cash premium:</strong> Offering full cash (no financing) can justify 3-5% additional discount — seller avoids bank delays.</li>
          <li>• <strong>Signed ITBI clause:</strong> Propose a price split on the escritura (common practice) only if legally advised.</li>
          <li>• <strong>Offer timing:</strong> December–January and June–July tend to be slower months — seller motivation is higher.</li>
        </ul>
      </div>
    </div>
  );
}
