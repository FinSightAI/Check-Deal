'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface Props { deal: Deal }

// ── ISRAEL: Mas Shevach Calculator ───────────────────────────────────────────
function MasShevachCalculator({ deal }: Props) {
  const { analysis, property } = deal;
  if (!analysis) return null;

  const currency = property.currency ?? 'ILS';
  const purchasePrice = property.agreedPrice || property.askingPrice;
  const deductibleBasis = purchasePrice
    + analysis.purchaseCosts.itbi
    + analysis.purchaseCosts.registrationFee
    + analysis.purchaseCosts.legalFees
    + (analysis.purchaseCosts.renovationBudget ?? 0);

  const [exitPrice, setExitPrice] = useState(Math.round(purchasePrice * 1.5 / 10000) * 10000);
  const [holdYears, setHoldYears] = useState(10);
  const [isPrimaryAfter18m, setIsPrimaryAfter18m] = useState(false);
  const [additionalDeductions, setAdditionalDeductions] = useState(0);

  const totalBasis = deductibleBasis + additionalDeductions;
  const grossGain = exitPrice - totalBasis;
  const netGain = Math.max(0, grossGain);

  // Mas Shevach: 25% flat on nominal gain
  // Primary residence exempt after 18+ months owner-occupation (once every 4 years)
  const taxableGain = isPrimaryAfter18m ? 0 : netGain;
  const masShevach = taxableGain * 0.25;
  const effectiveRate = netGain > 0 ? (masShevach / netGain) * 100 : 0;

  // Seller also pays ~2% + VAT broker commission
  const sellerBroker = exitPrice * 0.0234; // 2% + 17% VAT
  const netProceeds = exitPrice - masShevach - sellerBroker;
  const totalReturnPct = totalBasis > 0 ? ((netProceeds - totalBasis) / totalBasis) * 100 : 0;
  const annualizedReturn = holdYears > 0 ? (Math.pow(Math.max(0, netProceeds / totalBasis), 1 / holdYears) - 1) * 100 : 0;

  const sensitivityPrices = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0, 3.0].map(m => ({
    multiple: m,
    price: Math.round(purchasePrice * m),
    gain: Math.max(0, purchasePrice * m - totalBasis),
    tax: isPrimaryAfter18m ? 0 : Math.max(0, purchasePrice * m - totalBasis) * 0.25,
    net: purchasePrice * m - (isPrimaryAfter18m ? 0 : Math.max(0, purchasePrice * m - totalBasis) * 0.25) - purchasePrice * m * 0.0234,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-1">Mas Shevach (מס שבח) — Capital Gains Calculator</h3>
        <p className="text-sm text-slate-600">
          Israeli capital gains tax on property sale. Flat rate: <strong>25%</strong> on nominal gain.
          Primary residence exempt after 18 months of owner-occupation (once per 4 years).
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-3">Deductible Cost Basis</h4>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Purchase price', val: purchasePrice },
            { label: 'Mas Rechisha (purchase tax)', val: analysis.purchaseCosts.itbi },
            { label: 'Tabu + lawyer fees', val: analysis.purchaseCosts.registrationFee },
            { label: 'Legal fees (orech din)', val: analysis.purchaseCosts.legalFees },
            { label: 'Renovation budget', val: analysis.purchaseCosts.renovationBudget },
          ].filter(r => (r.val ?? 0) > 0).map(r => (
            <div key={r.label} className="flex justify-between">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-700">{formatCurrency(r.val!, currency)}</span>
            </div>
          ))}
          <div>
            <label className="text-slate-500">Additional improvements (₪)</label>
            <input type="number" step="10000" value={additionalDeductions || ''}
              onChange={e => setAdditionalDeductions(+e.target.value || 0)}
              placeholder="0"
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-slate-100">
            <span className="text-slate-700">Total deductible basis</span>
            <span className="text-blue-700">{formatCurrency(totalBasis, currency, true)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-slate-700">Exit Scenario</h4>
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-slate-500">Exit price</span>
            <span className="font-bold text-slate-800">{formatCurrency(exitPrice, currency, true)}</span>
          </div>
          <input type="range" min={purchasePrice * 0.5} max={purchasePrice * 4} step={50000}
            value={exitPrice} onChange={e => setExitPrice(+e.target.value)}
            className="w-full accent-amber-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>×0.5</span><span>×1.5</span><span>×2</span><span>×3</span><span>×4</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-slate-500">Holding period</span>
            <span className="font-bold text-slate-800">{holdYears} years</span>
          </div>
          <input type="range" min={1} max={20} step={1}
            value={holdYears} onChange={e => setHoldYears(+e.target.value)}
            className="w-full accent-amber-500" />
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
          <input type="checkbox" checked={isPrimaryAfter18m}
            onChange={e => setIsPrimaryAfter18m(e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          <div>
            <div className="text-sm font-medium text-slate-700">Primary residence — sold after 18+ months</div>
            <div className="text-xs text-slate-400">Full Mas Shevach exemption. May only be used once every 4 years.</div>
          </div>
        </label>
      </div>

      <div className={`rounded-xl p-5 border-2 ${masShevach === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
        {isPrimaryAfter18m && (
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
            ✅ Primary residence exemption — no Mas Shevach
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Gross gain', val: formatCurrency(netGain, currency, true), color: 'text-slate-800' },
            { label: 'Mas Shevach (25%)', val: formatCurrency(masShevach, currency, true), color: masShevach > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'Effective rate', val: `${effectiveRate.toFixed(1)}%`, color: 'text-slate-700' },
            { label: 'Net proceeds', val: formatCurrency(netProceeds, currency, true), color: 'text-blue-700' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">{m.label}</div>
              <div className={`font-bold text-lg ${m.color}`}>{m.val}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6 text-sm">
          <span className="text-slate-500">Net annualized return: <strong className={annualizedReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}>{annualizedReturn.toFixed(1)}%/yr</strong></span>
          <span className="text-slate-500">Total net return: <strong className={totalReturnPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>{totalReturnPct.toFixed(0)}%</strong></span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">Tax at Different Exit Prices</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2 text-left">Exit Price</th>
              <th className="px-4 py-2 text-right">Gain</th>
              <th className="px-4 py-2 text-right">Mas Shevach (25%)</th>
              <th className="px-4 py-2 text-right">Net (after tax + 2.34% agent)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sensitivityPrices.map(r => (
              <tr key={r.multiple} className={r.price === exitPrice ? 'bg-amber-50' : ''}>
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {formatCurrency(r.price, currency, true)}
                  <span className="text-xs text-slate-400 ml-1">×{r.multiple}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(r.gain, currency, true)}</td>
                <td className="px-4 py-2.5 text-right text-red-600">{r.tax > 0 ? formatCurrency(r.tax, currency, true) : '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCurrency(r.net, currency, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Mas Shevach must be filed within 30 days of sale (Form 7002). Your lawyer (orech din) handles the declaration.
        Improvement levy (היטל השבחה) may also apply — paid by seller, check with local municipality.
      </p>
    </div>
  );
}

// ── BRAZIL: GCAP progressive rates (2024) ─────────────────────────────────────
function calcGCAP(gain: number): number {
  if (gain <= 0) return 0;
  let tax = 0;
  const brackets = [
    { limit: 5_000_000, rate: 0.15 },
    { limit: 10_000_000, rate: 0.175 },
    { limit: 30_000_000, rate: 0.20 },
    { limit: Infinity, rate: 0.225 },
  ];
  let remaining = gain;
  let prev = 0;
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit - prev);
    if (taxable <= 0) break;
    tax += taxable * b.rate;
    remaining -= taxable;
    prev = b.limit;
    if (remaining <= 0) break;
  }
  return tax;
}

// Fator de redução: 5% per year held, for properties acquired before 1/1/2005
// Post-2005: no fator de redução (was eliminated), but GCAP can deduct corrigida costs
// We implement the post-2005 regime (most relevant)

export function GCAPCalculator({ deal }: Props) {
  // Route to Israeli calculator if this is an IL deal
  if (deal.property.country === 'IL') {
    return <MasShevachCalculator deal={deal} />;
  }

  const { analysis, property } = deal;
  if (!analysis) return null;

  const currency = property.currency ?? 'BRL';
  const purchasePrice = property.agreedPrice || property.askingPrice;
  const purchaseCosts = analysis.purchaseCosts;

  // Deductible basis: purchase price + all acquisition costs + renovation
  const deductibleBasis = purchasePrice
    + purchaseCosts.itbi
    + purchaseCosts.registrationFee
    + purchaseCosts.legalFees
    + purchaseCosts.brokerCommission
    + (purchaseCosts.renovationBudget ?? 0)
    + (purchaseCosts.evaluationFee ?? 0);

  const [exitPrice, setExitPrice] = useState(Math.round(purchasePrice * 1.5 / 10000) * 10000);
  const [holdYears, setHoldYears] = useState(10);
  const [additionalDeductions, setAdditionalDeductions] = useState(0);
  const [reinvest180, setReinvest180] = useState(false);
  const [isPrimaryResidence, setIsPrimaryResidence] = useState(false);

  const totalBasis = deductibleBasis + additionalDeductions;
  const grossGain = exitPrice - totalBasis;
  const netGain = Math.max(0, grossGain);

  // Exemptions
  let exemptionNote = '';
  let taxableGain = netGain;

  if (isPrimaryResidence && exitPrice <= 440_000 && deal.buyerProfile.existingPropertiesInBrazil <= 1) {
    taxableGain = 0;
    exemptionNote = 'Full exemption: primary residence sold for under R$440K';
  } else if (isPrimaryResidence && reinvest180) {
    taxableGain = 0;
    exemptionNote = 'Full exemption: proceeds reinvested in another residential property within 180 days';
  }

  const gcapTax = calcGCAP(taxableGain);
  const effectiveRate = netGain > 0 ? (gcapTax / netGain) * 100 : 0;
  const netProceeds = exitPrice - gcapTax - (exitPrice * 0.06); // 6% selling commission
  const totalReturnPct = totalBasis > 0 ? ((netProceeds - totalBasis) / totalBasis) * 100 : 0;
  const annualizedReturn = holdYears > 0 ? (Math.pow(Math.max(0, netProceeds / totalBasis), 1 / holdYears) - 1) * 100 : 0;

  // Sensitivity table: returns at different exit prices
  const sensitivityPrices = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0, 3.0].map(m => ({
    multiple: m,
    price: Math.round(purchasePrice * m),
    gain: Math.max(0, purchasePrice * m - totalBasis),
    tax: calcGCAP(Math.max(0, purchasePrice * m - totalBasis)),
    net: purchasePrice * m - calcGCAP(Math.max(0, purchasePrice * m - totalBasis)) - purchasePrice * m * 0.06,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-1">GCAP — Capital Gains Tax Calculator</h3>
        <p className="text-sm text-slate-600">
          Ganho de Capital on property sale. Progressive rates: 15% up to R$5M gain, 17.5% to R$10M, 20% to R$30M, 22.5% above.
        </p>
      </div>

      {/* Tax basis */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-3">Deductible Cost Basis</h4>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Purchase price', val: purchasePrice },
            { label: 'ITBI', val: purchaseCosts.itbi },
            { label: 'Cartório / registration', val: purchaseCosts.registrationFee },
            { label: 'Legal fees', val: purchaseCosts.legalFees },
            { label: 'Broker commission (if buyer paid)', val: purchaseCosts.brokerCommission },
            { label: 'Renovation budget', val: purchaseCosts.renovationBudget },
          ].filter(r => r.val > 0).map(r => (
            <div key={r.label} className="flex justify-between">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-700">{formatCurrency(r.val, currency)}</span>
            </div>
          ))}
          <div>
            <label className="text-slate-500">Additional improvements (R$)</label>
            <input type="number" step="10000" value={additionalDeductions || ''}
              onChange={e => setAdditionalDeductions(+e.target.value || 0)}
              placeholder="0"
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-slate-100">
            <span className="text-slate-700">Total deductible basis</span>
            <span className="text-blue-700">{formatCurrency(totalBasis, currency, true)}</span>
          </div>
        </div>
      </div>

      {/* Exit scenario */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-slate-700">Exit Scenario</h4>

        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-slate-500">Exit price</span>
            <span className="font-bold text-slate-800">{formatCurrency(exitPrice, currency, true)}</span>
          </div>
          <input type="range" min={purchasePrice * 0.5} max={purchasePrice * 4} step={50000}
            value={exitPrice} onChange={e => setExitPrice(+e.target.value)}
            className="w-full accent-amber-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>×0.5</span><span>×1.5</span><span>×2</span><span>×3</span><span>×4</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-slate-500">Holding period</span>
            <span className="font-bold text-slate-800">{holdYears} years</span>
          </div>
          <input type="range" min={1} max={20} step={1}
            value={holdYears} onChange={e => setHoldYears(+e.target.value)}
            className="w-full accent-amber-500" />
        </div>

        {/* Exemption options */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={isPrimaryResidence}
              onChange={e => setIsPrimaryResidence(e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <div>
              <div className="text-sm font-medium text-slate-700">Primary residence (imóvel residencial próprio)</div>
              <div className="text-xs text-slate-400">May qualify for R$440K exemption or 180-day reinvestment rule</div>
            </div>
          </label>
          {isPrimaryResidence && (
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100">
              <input type="checkbox" checked={reinvest180}
                onChange={e => setReinvest180(e.target.checked)}
                className="w-4 h-4 accent-blue-500" />
              <div>
                <div className="text-sm font-medium text-blue-800">Reinvest proceeds within 180 days</div>
                <div className="text-xs text-blue-600">Full GCAP exemption if buying another residential property in Brazil within 180 days</div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Result */}
      <div className={`rounded-xl p-5 border-2 ${gcapTax === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
        {exemptionNote && (
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
            ✅ {exemptionNote}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Gross gain', val: formatCurrency(netGain, currency, true), color: 'text-slate-800' },
            { label: 'GCAP tax', val: formatCurrency(gcapTax, currency, true), color: gcapTax > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'Effective rate', val: `${effectiveRate.toFixed(1)}%`, color: 'text-slate-700' },
            { label: 'Net proceeds', val: formatCurrency(netProceeds, currency, true), color: 'text-blue-700' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-lg p-3 border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">{m.label}</div>
              <div className={`font-bold text-lg ${m.color}`}>{m.val}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6 text-sm">
          <span className="text-slate-500">Net annualized return: <strong className={annualizedReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}>{annualizedReturn.toFixed(1)}%/yr</strong></span>
          <span className="text-slate-500">Total net return: <strong className={totalReturnPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>{totalReturnPct.toFixed(0)}%</strong></span>
        </div>
      </div>

      {/* Sensitivity table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">Tax at Different Exit Prices</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2 text-left">Exit Price</th>
              <th className="px-4 py-2 text-right">Gain</th>
              <th className="px-4 py-2 text-right">GCAP Tax</th>
              <th className="px-4 py-2 text-right">Net (after tax + 6% commission)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sensitivityPrices.map(r => (
              <tr key={r.multiple} className={r.price === exitPrice ? 'bg-amber-50' : ''}>
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {formatCurrency(r.price, currency, true)}
                  <span className="text-xs text-slate-400 ml-1">×{r.multiple}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(r.gain, currency, true)}</td>
                <td className="px-4 py-2.5 text-right text-red-600">{r.tax > 0 ? formatCurrency(r.tax, currency, true) : '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCurrency(r.net, currency, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-center">
        GCAP due within 30 days of sale (DARF payment). Always confirm with a Brazilian contador — rules change frequently.
      </p>
    </div>
  );
}
