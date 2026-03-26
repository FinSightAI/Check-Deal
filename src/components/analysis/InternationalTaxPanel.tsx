'use client';

import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import {
  buildCrossBorderSummary,
  calculateIsraeliTaxOnBrazilianRent,
  analyzeRomanianTaxRelevance,
} from '@/lib/taxes/international';

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

export function InternationalTaxPanel({ deal, analysis }: Props) {
  const { buyerProfile } = deal;
  const { purchaseCosts, annualCosts } = analysis;
  const monthlyRent = deal.rentalAssumptions.ltr.monthlyRent;
  const annualRent = monthlyRent * 12;
  const brazilTaxAnnual = annualRent * (analysis.marketContext.inflationRate > 0 ? 0.15 : 0.275); // rough

  // Use the actual tax rate from analysis
  const brazilRentalTaxRate = monthlyRent > 0
    ? (analysis.rentalAnalysis.ltr.taxOnRent / Math.max(annualRent, 1)) * 100
    : 15;

  const mortgageInterestAnnual = analysis.financing.totalInterest / deal.financing.loanTermYears || 0;

  const crossBorder = buildCrossBorderSummary(
    buyerProfile.taxResidency,
    brazilRentalTaxRate,
    purchaseCosts.itbi,
    purchaseCosts.propertyPrice,
    monthlyRent,
    buyerProfile.isRomanianPassportHolder
  );

  const israeliAnalysis = buyerProfile.taxResidency === 'IL'
    ? calculateIsraeliTaxOnBrazilianRent(monthlyRent, brazilTaxAnnual, mortgageInterestAnnual, 300000)
    : null;

  const romanianAnalysis = buyerProfile.isRomanianPassportHolder
    ? analyzeRomanianTaxRelevance(buyerProfile.taxResidency === 'RO')
    : null;

  const isUAE = buyerProfile.taxResidency === 'AE';
  const isIsraeli = buyerProfile.taxResidency === 'IL';

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="bg-slate-800 text-white rounded-xl p-5">
        <div className="text-xs text-slate-400 mb-1">Your Cross-Border Profile</div>
        <div className="font-semibold text-lg">{crossBorder.profile}</div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-slate-400">Brazilian Tax (rental)</div>
            <div className="font-semibold text-amber-400">{crossBorder.brazilTax.rentalRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-slate-400">{crossBorder.homeTax.country} Tax (rental)</div>
            <div className={`font-semibold ${isUAE ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isUAE ? 'None ✅' : `${crossBorder.homeTax.rentalRate}%`}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Effective Combined</div>
            <div className="font-semibold text-white">{crossBorder.effectiveCombinedRentalRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Israeli Section 122A analysis */}
      {israeliAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-blue-900">🇮🇱 Israeli Tax — Section 122A Analysis</h3>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Flat 15% Track', rate: 15, annual: annualRent * 0.15 - Math.min(brazilTaxAnnual, annualRent * 0.15), recommended: israeliAnalysis.rentalIncomeTrack === 'flat15' },
              { label: 'Flat 10% Track', rate: 10, annual: annualRent * 0.10 - Math.min(brazilTaxAnnual, annualRent * 0.10), recommended: israeliAnalysis.rentalIncomeTrack === 'flat10' },
              { label: 'Marginal Rate', rate: 35, annual: annualRent * 0.35 - Math.min(brazilTaxAnnual, annualRent * 0.35), recommended: israeliAnalysis.rentalIncomeTrack === 'marginal' },
            ].map((track) => (
              <div
                key={track.label}
                className={`rounded-lg p-3 border-2 text-center ${track.recommended ? 'border-blue-500 bg-blue-100' : 'border-slate-200 bg-white'}`}
              >
                <div className="text-xs font-medium text-slate-500">{track.label}</div>
                <div className={`text-lg font-bold mt-1 ${track.recommended ? 'text-blue-700' : 'text-slate-600'}`}>
                  {track.rate}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ₪{Math.max(0, track.annual * 0.18 * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr
                </div>
                {track.recommended && (
                  <div className="text-xs font-semibold text-blue-600 mt-1">✅ Optimal</div>
                )}
              </div>
            ))}
          </div>

          <div className="text-xs text-blue-800 space-y-1">
            <p>• <strong>Brazilian taxes paid</strong> credited against Israeli tax (no double taxation under Section 200)</p>
            <p>• <strong>Net additional Israeli tax</strong> on top of Brazilian: ~{Math.max(0, 15 - brazilRentalTaxRate).toFixed(0)}% (credit offsets the rest)</p>
            <p>• <strong>Report deadline:</strong> April 30 each year on Form 1301 (or extended with accountant)</p>
            <p>• <strong>Property registration:</strong> Must notify Israeli Tax Authority within 30 days of purchase</p>
          </div>

          {annualRent > 0 && (
            <div className="bg-white rounded-lg p-3 flex items-center justify-between text-sm border border-blue-200">
              <span className="text-blue-800">Est. annual Israeli tax on this rental income</span>
              <span className="font-bold text-blue-900">
                ₪{(Math.max(0, annualRent * 0.15 - brazilTaxAnnual) * 0.18).toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr
              </span>
            </div>
          )}

          {israeliAnalysis.reportingObligation && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">
              📋 {israeliAnalysis.reportingObligation}
            </div>
          )}
        </div>
      )}

      {/* Romanian passport analysis */}
      {romanianAnalysis && (
        <div className={`border rounded-xl p-5 space-y-3 ${romanianAnalysis.isRelevant ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className="font-semibold text-slate-800">🇷🇴 Romanian Passport — What It Does (and Doesn't) Do</h3>

          {romanianAnalysis.notes.map((note, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{note}</p>
          ))}

          {!romanianAnalysis.isRelevant && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: '✅ EU Banking', desc: 'Open Wise, Revolut, N26 account. Receive rent in EUR/BRL efficiently.' },
                { label: '✅ EU Travel', desc: 'Schengen access, easier property visits and meetings with Brazilian agents.' },
                { label: '❌ Tax Benefit', desc: 'Does NOT create Romanian tax residency. Your Israeli tax obligations remain.' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-lg p-3 border border-slate-200 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">{item.label}</div>
                  <div className="text-slate-500">{item.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UAE zero tax */}
      {isUAE && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h3 className="font-semibold text-emerald-900">🇦🇪 UAE Tax Residency — Optimal Profile</h3>
          <p className="text-sm text-emerald-800 mt-2">
            As a UAE tax resident, only Brazilian taxes apply to your rental income:
            15% IRRF withholding (if no CPF) or progressive rates (if CPF holder).
            No additional personal income tax in the UAE. This is the most tax-efficient
            structure for Brazilian real estate investment.
          </p>
          <div className="mt-3 text-xs text-emerald-700">
            ⚠️ Requires genuine UAE tax residency (Emirates ID + residency visa + center of life in UAE).
            A UAE residency visa alone is not sufficient; you must spend 183+ days/year or hold a UAE property and establish primary residence.
          </div>
        </div>
      )}

      {/* Key considerations */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Key Considerations for Your Profile</h3>
        <ul className="space-y-2">
          {crossBorder.keyConsiderations.map((c, i) => (
            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action items */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-900 mb-3">Action Items Before Purchase</h3>
        <ol className="space-y-2">
          {crossBorder.actionItems.map((item, i) => (
            <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
              <span className="font-bold flex-shrink-0 text-amber-600">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Capital gains summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Capital Gains on Exit</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Brazil GCAP</div>
            <div className="font-semibold text-slate-800">15% on gain</div>
            <div className="text-xs text-slate-400">Exempt if reinvested within 180 days</div>
          </div>
          <div>
            <div className="text-slate-500">{crossBorder.homeTax.country} CGT</div>
            <div className="font-semibold text-slate-800">
              {isUAE ? 'None ✅' : `${crossBorder.homeTax.cgt}% on gain`}
            </div>
            <div className="text-xs text-slate-400">
              {isIsraeli ? 'Brazilian CGT credited. Net: ~10% additional' : ''}
              {isUAE ? 'Zero CGT in UAE' : ''}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Tax information is for guidance only. Consult a licensed tax advisor in both Brazil and your country of tax residency before transacting.
      </p>
    </div>
  );
}
