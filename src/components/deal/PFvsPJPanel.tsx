'use client';

import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface Props {
  deal: Deal;
}

export function PFvsPJPanel({ deal }: Props) {
  const { analysis, property, rentalAssumptions } = deal;
  if (!analysis) return null;

  // PF vs PJ is Brazil-specific — not applicable to Israel or US
  if (property.country !== 'BR') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
        <p className="font-medium">PF vs PJ analysis is specific to the Brazilian tax system.</p>
        <p className="text-sm mt-1">
          {property.country === 'US'
            ? 'For US properties, consult a CPA about LLC vs individual ownership, depreciation, and federal/state income tax optimization.'
            : 'For Israeli properties, see the rental income tax tracks (Track 1 / Track 2 / Track 3) in the Cost Breakdown tab.'}
        </p>
      </div>
    );
  }

  const price = property.agreedPrice || property.askingPrice;
  const monthlyRent = rentalAssumptions.ltr.monthlyRent;
  const annualRent = monthlyRent * 12;
  const vacancyRate = rentalAssumptions.ltr.vacancyRatePercent / 100;
  const effectiveAnnualRent = annualRent * (1 - vacancyRate);

  // ── PF (individual) tax on rent ──────────────────────────────────────────
  // Carnê-Leão progressive table (2024): 0–2259 = 0%, 2259–2826 = 7.5%, 2826–3751 = 15%, 3751–4664 = 22.5%, >4664 = 27.5%
  const monthlyNetRent = monthlyRent * (1 - vacancyRate);
  let pfMonthlyTax = 0;
  if (monthlyNetRent > 4664) {
    pfMonthlyTax = (monthlyNetRent - 4664) * 0.275 + (4664 - 3751) * 0.225 + (3751 - 2826) * 0.15 + (2826 - 2259) * 0.075;
  } else if (monthlyNetRent > 3751) {
    pfMonthlyTax = (monthlyNetRent - 3751) * 0.225 + (3751 - 2826) * 0.15 + (2826 - 2259) * 0.075;
  } else if (monthlyNetRent > 2826) {
    pfMonthlyTax = (monthlyNetRent - 2826) * 0.15 + (2826 - 2259) * 0.075;
  } else if (monthlyNetRent > 2259) {
    pfMonthlyTax = (monthlyNetRent - 2259) * 0.075;
  }
  const pfAnnualTax = pfMonthlyTax * 12;
  const pfEffectiveRate = effectiveAnnualRent > 0 ? (pfAnnualTax / effectiveAnnualRent) * 100 : 0;

  // Capital gains PF: 15–22.5% on gain (>R$440K reduces exemption)
  const estimatedGain10y = price * Math.pow(1.07, 10) - price; // 7% appreciation
  let pfCGTRate = 15;
  if (estimatedGain10y > 5_000_000) pfCGTRate = 22.5;
  else if (estimatedGain10y > 2_000_000) pfCGTRate = 20;
  else if (estimatedGain10y > 1_000_000) pfCGTRate = 17.5;
  const pfCGT = estimatedGain10y * (pfCGTRate / 100);

  // ── PJ (Lucro Presumido — most common for rental SRL/LTDA) ──────────────
  // 11.33% effective rate on gross rent (IRPJ 5.93% + CSLL 1.62% + PIS/COFINS 3.65% + INSS optional)
  // Actually typical breakdown: IRPJ presunção 32%×25% + CSLL 32%×9% + PIS 0.65% + COFINS 3% = ~11.33%
  const pjTaxRate = 11.33;
  const pjAnnualTax = effectiveAnnualRent * (pjTaxRate / 100);
  const pjEffectiveRate = pjTaxRate;

  // PJ accounting fees: R$350-600/month
  const pjAccountingMonthly = 450;
  const pjAccountingAnnual = pjAccountingMonthly * 12;

  // PJ setup costs: ~R$2,000–5,000 (Junta Comercial, CNPJ, lawyer)
  const pjSetupCost = 3500;

  // PJ capital gains: 34% on gain (IRPJ 25% + CSLL 9%), but many structures avoid this via dividends
  const pjCGT = estimatedGain10y * 0.34;

  // ── Net income comparison ─────────────────────────────────────────────────
  const pfNetRent = effectiveAnnualRent - pfAnnualTax;
  const pjNetRent = effectiveAnnualRent - pjAnnualTax - pjAccountingAnnual;

  const pfBetter = pfNetRent > pjNetRent;

  // ITBI: PJ may have different rate or exemption (off-plan PJ can avoid ITBI sometimes)
  const itbi = analysis.purchaseCosts.itbi;

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-xl p-5 border-2 ${pfBetter ? 'bg-blue-50 border-blue-300' : 'bg-emerald-50 border-emerald-300'}`}>
        <div className="font-bold text-lg text-slate-800 mb-1">
          {pfBetter ? '👤 Individual (PF) is better for this property' : '🏢 Company (PJ) may save on taxes'}
        </div>
        <p className="text-sm text-slate-600">
          {pfBetter
            ? `At R$${Math.round(monthlyRent).toLocaleString('pt-BR')}/month rent, your effective rental tax as an individual is lower than PJ after accounting costs.`
            : `At this rent level, the flat PJ rate (${pjTaxRate}%) beats the progressive PF table, even after accounting fees.`}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* PF card */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="font-bold text-slate-800">Pessoa Física (PF)</h3>
              <div className="text-xs text-slate-500">Individual ownership</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Rental tax rate" value={`${pfEffectiveRate.toFixed(1)}% effective`} note="Progressive Carnê-Leão" />
            <Row label="Annual rental tax" value={formatCurrency(pfAnnualTax, 'BRL')} highlight={pfBetter ? 'good' : 'bad'} />
            <Row label="Net rental income" value={formatCurrency(pfNetRent, 'BRL') + '/yr'} highlight={pfBetter ? 'good' : 'neutral'} />
            <Row label="Accounting fees" value="None" />
            <Row label="Setup cost" value="None" />
            <Row label="Capital gains tax" value={`${pfCGTRate}% on gain`} note="After 10yr est." />
            <Row label="Est. CGT (10yr)" value={formatCurrency(pfCGT, 'BRL', true)} />
            <Row label="ITBI" value={formatCurrency(itbi, 'BRL')} />
          </div>
          <div className="mt-4 pt-4 border-t border-blue-100">
            <div className="text-xs text-slate-500 space-y-1">
              <div>✅ Simpler — no company to maintain</div>
              <div>✅ Can use FGTS for purchase</div>
              <div>✅ Easier residential financing</div>
              <div>⚠️ High earners face 27.5% marginal rate</div>
              <div>⚠️ Unlimited personal liability</div>
            </div>
          </div>
        </div>

        {/* PJ card */}
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏢</span>
            <div>
              <h3 className="font-bold text-slate-800">Pessoa Jurídica (PJ)</h3>
              <div className="text-xs text-slate-500">LTDA / SRL holding company</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Rental tax rate" value={`${pjTaxRate}% flat`} note="Lucro Presumido" />
            <Row label="Annual rental tax" value={formatCurrency(pjAnnualTax, 'BRL')} highlight={!pfBetter ? 'good' : 'bad'} />
            <Row label="Net rental income" value={formatCurrency(pjNetRent, 'BRL') + '/yr'} highlight={!pfBetter ? 'good' : 'neutral'} />
            <Row label="Accounting fees" value={`~R$${pjAccountingMonthly}/month`} note={formatCurrency(pjAccountingAnnual, 'BRL') + '/yr'} />
            <Row label="Setup cost" value={formatCurrency(pjSetupCost, 'BRL')} note="One-time" />
            <Row label="Capital gains tax" value="34% on gain" note="IRPJ + CSLL" />
            <Row label="Est. CGT (10yr)" value={formatCurrency(pjCGT, 'BRL', true)} />
            <Row label="ITBI" value={formatCurrency(itbi, 'BRL')} note="Same rate usually" />
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-100">
            <div className="text-xs text-slate-500 space-y-1">
              <div>✅ Flat 11.33% beats high-income PF</div>
              <div>✅ Deduct more operating expenses</div>
              <div>✅ Asset protection / liability shielding</div>
              <div>✅ Easier to add foreign partners</div>
              <div>⚠️ Ongoing accounting required</div>
              <div>⚠️ No FGTS, harder financing</div>
              <div>⚠️ CGT much higher (34%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Break-even analysis */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-3">When Does PJ Make Sense?</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">PJ saves on rent tax vs PF</div>
            <div className={`font-bold ${pfBetter ? 'text-red-600' : 'text-emerald-600'}`}>
              {pfBetter
                ? `PF saves ${formatCurrency(pjNetRent - pfNetRent < 0 ? pfNetRent - pjNetRent : pjNetRent - pfNetRent, 'BRL')}/yr`
                : `PJ saves ${formatCurrency(pfNetRent - pjNetRent, 'BRL')}/yr`}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">PF CGT advantage (10yr)</div>
            <div className="font-bold text-blue-600">
              {formatCurrency(pjCGT - pfCGT, 'BRL', true)} less tax
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">PJ break-even rent</div>
            <div className="font-bold text-slate-700">
              ~R${Math.round(4664 * 0.11333 / 0.275 + 4664).toLocaleString('pt-BR')}/mo
            </div>
            <div className="text-xs text-slate-400">Above this, PJ saves on rent tax</div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          ⚠️ This is an educational estimate only. Always consult a Brazilian tax advisor (contador) before choosing your purchase structure. Rules change frequently.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <div className="text-right">
        <span className={`font-medium ${highlight === 'good' ? 'text-emerald-600' : highlight === 'bad' ? 'text-red-500' : 'text-slate-800'}`}>
          {value}
        </span>
        {note && <div className="text-xs text-slate-400">{note}</div>}
      </div>
    </div>
  );
}
