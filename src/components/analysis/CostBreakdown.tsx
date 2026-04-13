'use client';

import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { BR_STATES } from '@/lib/constants/countries';

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

export function CostBreakdown({ deal, analysis }: Props) {
  const { purchaseCosts, annualCosts } = analysis;
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const isIsrael = deal.property.country === 'IL';
  const isUSA = deal.property.country === 'US';
  const currency = deal.property.currency ?? 'BRL';
  const stateConfig = BR_STATES[deal.property.state];

  // Market-aware labels
  const transferTaxLabel = isIsrael
    ? 'Mas Rechisha (Purchase Tax)'
    : isUSA
    ? 'Transfer Tax + Title Insurance'
    : `ITBI (${stateConfig?.itbiRate ?? 3}%)`;
  const transferTaxNote = isIsrael
    ? `Mas Rechisha — ${deal.buyerProfile.isFirstHomeBuyer ? 'first home rates apply' : 'investment/additional property rate'}`
    : isUSA
    ? `State transfer tax + title insurance (owner's + lender's) — ${deal.property.state}`
    : `Imposto de Transmissão de Bens Imóveis — ${deal.property.state}`;
  const registrationNote = isIsrael
    ? 'Tabu + lawyer fees (incl. 17% VAT)'
    : isUSA
    ? 'Escrow/closing fee + recording fee'
    : 'Cartório de Registro de Imóveis';
  const mortgageFeesNote = isIsrael
    ? 'Bank arrangement fee + appraisal'
    : isUSA
    ? 'Loan origination (1%) + underwriting'
    : 'IOF + processing';
  const appraisalNote = isIsrael
    ? "Bank appraisal (Shama'ut bankait)"
    : isUSA
    ? 'Lender-ordered appraisal'
    : 'Avaliação do imóvel';
  const propertyTaxLabel = isIsrael ? 'Arnona' : isUSA ? 'Property Tax' : 'IPTU';
  const propertyTaxNote = isIsrael
    ? 'Annual municipal tax (estimated from city/size)'
    : isUSA
    ? `Annual property tax — estimated ${deal.property.state} rate`
    : 'Property tax (estimated from market value)';
  const buildingFeesLabel = isIsrael ? 'Vaad Bayit' : isUSA ? 'HOA / Condo Fee' : 'Condominium';
  const buildingFeesNote = isIsrael
    ? 'Building maintenance × 12'
    : isUSA
    ? 'Monthly HOA fee × 12 (if applicable)'
    : 'Monthly condomínio × 12';
  const insuranceNote = isIsrael
    ? 'Bituach dira (building + contents)'
    : isUSA
    ? 'Homeowners insurance (may include flood in FL/TX)'
    : 'Seguro residencial';

  const purchaseItems = [
    { label: 'Property Price', amount: purchaseCosts.propertyPrice, note: '' },
    { label: transferTaxLabel, amount: purchaseCosts.itbi, note: transferTaxNote },
    { label: 'Registration & Legal', amount: purchaseCosts.registrationFee, note: registrationNote },
    { label: 'Legal Fees', amount: purchaseCosts.legalFees, note: isIsrael ? 'Lawyer (orech din) — included in registration above' : isUSA ? 'Real estate attorney (recommended for foreign buyers)' : 'Lawyer review (recommended)' },
    ...(purchaseCosts.mortgageArrangementFee
      ? [{ label: 'Mortgage Fees', amount: purchaseCosts.mortgageArrangementFee, note: mortgageFeesNote }]
      : []),
    ...(purchaseCosts.evaluationFee
      ? [{ label: 'Property Appraisal', amount: purchaseCosts.evaluationFee, note: appraisalNote }]
      : []),
    ...(purchaseCosts.renovationBudget
      ? [{ label: 'Renovation Budget', amount: purchaseCosts.renovationBudget, note: 'As specified' }]
      : []),
  ].filter(item => item.amount > 0 || item.label === 'Property Price');

  const annualItems = [
    { label: propertyTaxLabel, amount: annualCosts.iptu, note: propertyTaxNote },
    { label: buildingFeesLabel, amount: annualCosts.condominium, note: buildingFeesNote },
    { label: 'Insurance', amount: annualCosts.insurance, note: insuranceNote },
    { label: 'Maintenance', amount: annualCosts.maintenance, note: '~0.5% of property value' },
    ...(annualCosts.managementFee
      ? [{ label: 'Management Fee', amount: annualCosts.managementFee, note: 'Property manager' }]
      : []),
  ];

  // Tax information by buyer type
  const isNonResident = deal.buyerProfile.citizenshipStatus === 'foreigner' && !deal.buyerProfile.brazilianCPF;

  return (
    <div className="space-y-6">
      {/* Purchase costs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">One-Time Purchase Costs</h3>
          <span className="text-sm text-slate-500">
            {formatPercent((purchaseCosts.totalTransactionCosts / price) * 100)} of price
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {purchaseItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                {item.note && <div className="text-xs text-slate-400">{item.note}</div>}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {formatCurrency(item.amount, currency)}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Total Transaction Costs</span>
          <span className="font-bold text-slate-800">{formatCurrency(purchaseCosts.totalTransactionCosts, currency)}</span>
        </div>
        <div className="bg-blue-50 border-t border-blue-100 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-blue-800">Total Cash Required</span>
          <span className="font-bold text-blue-900 text-lg">{formatCurrency(purchaseCosts.totalCashRequired, currency)}</span>
        </div>
      </div>

      {/* Annual recurring costs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Annual Recurring Costs</h3>
          <span className="text-sm text-slate-500">
            {formatCurrency(annualCosts.total / 12, currency)}/month
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {annualItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                {item.note && <div className="text-xs text-slate-400">{item.note}</div>}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {formatCurrency(item.amount, currency)}/yr
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Total Annual Costs</span>
          <span className="font-bold text-slate-800">{formatCurrency(annualCosts.total, currency)}/yr</span>
        </div>
      </div>

      {/* Tax Summary — market-aware */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-amber-900">
          {isIsrael ? 'Israeli' : isUSA ? 'US' : 'Brazilian'} Tax Summary
        </h3>
        <div className="space-y-2 text-sm">
          {isUSA ? (
            <>
              <TaxRow
                title="Transfer Tax + Title Insurance"
                detail={`State transfer tax + title insurance — ${deal.property.state}`}
                amount={formatCurrency(purchaseCosts.itbi, currency)}
              />
              <TaxRow
                title="Property Tax (Annual)"
                detail={`County property tax — estimated rate for ${deal.property.state}`}
                amount={`${formatCurrency(annualCosts.iptu, currency)}/yr`}
              />
              <TaxRow
                title="Rental Income Tax"
                detail={
                  deal.buyerProfile.citizenshipStatus === 'foreigner'
                    ? '30% gross withholding (or file W-8ECI for ECI treatment — regular rates with deductions)'
                    : deal.buyerProfile.isCompanyPurchase
                    ? 'LLC: pass-through to individual rate (10-37%) or C-Corp 21%'
                    : 'Federal: 10-37% marginal (after depreciation + deductions). State income tax varies.'
                }
                amount="See rental tab"
              />
              <TaxRow
                title="Capital Gains"
                detail="Long-term (held >1yr): 0/15/20% federal + state. FIRPTA: 15% withheld at sale for foreign sellers."
                amount="On exit"
              />
              <TaxRow
                title="Depreciation Deduction"
                detail="Residential: 27.5-year straight-line on building value. Significant annual deduction against rental income."
                amount="Tax benefit"
              />
            </>
          ) : isIsrael ? (
            <>
              <TaxRow
                title="Mas Rechisha (Purchase Tax)"
                detail={deal.buyerProfile.isFirstHomeBuyer
                  ? '0% up to ₪1,978,745 — first home rates'
                  : '8% up to ₪5,872,725, 10% above — investment rate'}
                amount={formatCurrency(purchaseCosts.itbi, currency)}
              />
              <TaxRow
                title="Arnona (Annual Property Tax)"
                detail="Municipal tax — varies by city (₪35-95/m²/year)"
                amount={`${formatCurrency(annualCosts.iptu, currency)}/yr`}
              />
              <TaxRow
                title="Rental Income Tax"
                detail={
                  deal.buyerProfile.citizenshipStatus === 'foreigner'
                    ? 'Track 2: 10% flat on gross rental income (non-resident)'
                    : deal.buyerProfile.isCompanyPurchase
                    ? '~23% corporate tax + dividend withholding'
                    : deal.rentalAssumptions.ltr.monthlyRent <= 5471
                    ? `Track 1: Exempt (rent ₪${deal.rentalAssumptions.ltr.monthlyRent.toLocaleString()} < ₪5,471 threshold)`
                    : 'Track 2: 10% flat recommended (above exempt threshold)'
                }
                amount="See rental tab"
              />
              <TaxRow
                title="Capital Gains (Mas Shevach)"
                detail="25% on nominal gain. Primary residence exempt after 18 months owner-occupation."
                amount="On exit"
              />
            </>
          ) : (
            <>
              <TaxRow
                title="ITBI (Purchase Tax)"
                detail={`${stateConfig?.itbiRate ?? 3}% of purchase price — paid once at closing`}
                amount={formatCurrency(purchaseCosts.itbi, currency)}
              />
              <TaxRow
                title="IPTU (Annual Property Tax)"
                detail="Municipal tax — based on assessed value (valor venal)"
                amount={`${formatCurrency(annualCosts.iptu, currency)}/yr`}
              />
              <TaxRow
                title="Rental Income Tax"
                detail={
                  isNonResident
                    ? '15% flat IRRF (non-resident withholding tax)'
                    : deal.buyerProfile.isCompanyPurchase
                    ? '~11.33% (PJ Lucro Presumido)'
                    : 'Progressive IRPF 0-27.5% based on monthly rent'
                }
                amount="See rental tab"
              />
              <TaxRow
                title="Capital Gains (GCAP)"
                detail="15-22.5% on profit. Exempt if reinvested within 180 days, or primary residence under R$440k"
                amount="On exit"
              />
            </>
          )}
        </div>

        {isUSA && deal.buyerProfile.citizenshipStatus === 'foreigner' && (
          <div className="bg-amber-100 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ FIRPTA: As a foreign seller, 15% of the gross sale price will be withheld at future sale.
            File W-8ECI with your tenant/PM to avoid 30% gross withholding on rental income.
            Get an ITIN and hire a US CPA specializing in non-resident investors.
          </div>
        )}
        {isUSA && deal.buyerProfile.isCompanyPurchase && (
          <div className="bg-green-100 rounded-lg p-3 text-xs text-green-800">
            ✅ LLC structure recommended for US investment properties. Provides liability protection and
            pass-through taxation. Consider Delaware/Wyoming LLC if privacy is important.
          </div>
        )}
        {!isUSA && !isIsrael && isNonResident && (
          <div className="bg-amber-100 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ As a non-resident without CPF: You pay 15% IRRF on gross rental income directly at source.
            Getting a CPF allows you to use the progressive rates and deduct expenses.
          </div>
        )}
        {!isUSA && !isIsrael && deal.buyerProfile.isCompanyPurchase && (
          <div className="bg-green-100 rounded-lg p-3 text-xs text-green-800">
            ✅ Company purchase (PJ Lucro Presumido): ~11.33% effective tax rate on rental income.
            Consult a Brazilian accountant (contador) to set up the structure.
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Important Notes</p>
        <ul className="space-y-1 text-blue-700">
          <li>• Costs are estimates. Final amounts may vary.</li>
          {isUSA ? (
            <>
              <li>• Property tax is estimated from state average. Actual amount depends on county assessed value — verify with county appraiser.</li>
              <li>• Title insurance is a one-time cost. Both lender and owner policies strongly recommended.</li>
              <li>• Florida: homeowners insurance costs can be significant ($3K-8K+/yr). Get quotes before committing.</li>
              <li>• Depreciation deduction (27.5yr) is a major tax benefit — consult a US CPA to optimize.</li>
            </>
          ) : isIsrael ? (
            <>
              <li>• Arnona is estimated from city and size. Request actual amount from seller.</li>
              <li>• Mas Rechisha must be filed within 50 days of signing (Form 7000). Your lawyer handles this.</li>
              <li>• Legal fees include 17% VAT (Mam). Budget ~0.75-1% of purchase price.</li>
            </>
          ) : (
            <>
              <li>• IPTU is estimated from market price. Request actual IPTU carnê from seller.</li>
              <li>• Broker commission (6% standard) is typically paid by the seller and factored into the asking price.</li>
              <li>• All amounts in Brazilian Reais (BRL).</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

function TaxRow({ title, detail, amount }: { title: string; detail: string; amount: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-medium text-amber-900">{title}</div>
        <div className="text-amber-700 text-xs">{detail}</div>
      </div>
      <div className="text-sm font-semibold text-amber-900 whitespace-nowrap">{amount}</div>
    </div>
  );
}
