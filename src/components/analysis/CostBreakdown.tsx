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
  const stateConfig = BR_STATES[deal.property.state];

  const purchaseItems = [
    { label: 'Property Price', amount: purchaseCosts.propertyPrice, note: '' },
    {
      label: `ITBI (${stateConfig?.itbiRate ?? 3}%)`,
      amount: purchaseCosts.itbi,
      note: `Imposto de Transmissão de Bens Imóveis — ${deal.property.state}`,
    },
    {
      label: 'Registration & Notary',
      amount: purchaseCosts.registrationFee,
      note: 'Cartório de Registro de Imóveis',
    },
    { label: 'Legal Fees', amount: purchaseCosts.legalFees, note: 'Lawyer review (recommended)' },
    ...(purchaseCosts.mortgageArrangementFee
      ? [{ label: 'Mortgage Fees', amount: purchaseCosts.mortgageArrangementFee, note: 'IOF + processing' }]
      : []),
    ...(purchaseCosts.evaluationFee
      ? [{ label: 'Property Appraisal', amount: purchaseCosts.evaluationFee, note: 'Avaliação do imóvel' }]
      : []),
    ...(purchaseCosts.renovationBudget
      ? [{ label: 'Renovation Budget', amount: purchaseCosts.renovationBudget, note: 'As specified' }]
      : []),
  ];

  const annualItems = [
    { label: 'IPTU', amount: annualCosts.iptu, note: 'Property tax (estimated from market value)' },
    { label: 'Condominium', amount: annualCosts.condominium, note: 'Monthly condomínio × 12' },
    { label: 'Insurance', amount: annualCosts.insurance, note: 'Seguro residencial' },
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
                {formatCurrency(item.amount, 'BRL')}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Total Transaction Costs</span>
          <span className="font-bold text-slate-800">{formatCurrency(purchaseCosts.totalTransactionCosts, 'BRL')}</span>
        </div>
        <div className="bg-blue-50 border-t border-blue-100 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-blue-800">Total Cash Required</span>
          <span className="font-bold text-blue-900 text-lg">{formatCurrency(purchaseCosts.totalCashRequired, 'BRL')}</span>
        </div>
      </div>

      {/* Annual recurring costs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Annual Recurring Costs</h3>
          <span className="text-sm text-slate-500">
            {formatCurrency(annualCosts.total / 12, 'BRL')}/month
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
                {formatCurrency(item.amount, 'BRL')}/yr
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Total Annual Costs</span>
          <span className="font-bold text-slate-800">{formatCurrency(annualCosts.total, 'BRL')}/yr</span>
        </div>
      </div>

      {/* Tax information */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-amber-900">Brazilian Tax Summary</h3>
        <div className="space-y-2 text-sm">
          <TaxRow
            title="ITBI (Purchase Tax)"
            detail={`${stateConfig?.itbiRate ?? 3}% of purchase price — paid once at closing`}
            amount={formatCurrency(purchaseCosts.itbi, 'BRL')}
          />
          <TaxRow
            title="IPTU (Annual Property Tax)"
            detail="Municipal tax — based on assessed value (valor venal)"
            amount={`${formatCurrency(annualCosts.iptu, 'BRL')}/yr`}
          />
          <TaxRow
            title="Rental Income Tax"
            detail={
              isNonResident
                ? '15% flat IRRF (non-resident withholding tax)'
                : deal.buyerProfile.isCompanyPurchase
                ? '~11.33% (PJ Lucro Presumido)'
                : `Progressive IRPF 0-27.5% based on monthly rent`
            }
            amount="See rental tab"
          />
          <TaxRow
            title="Capital Gains (GCAP)"
            detail="15-22.5% on profit. Exempt if reinvested within 180 days, or primary residence under R$440k"
            amount="On exit"
          />
        </div>

        {isNonResident && (
          <div className="bg-amber-100 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ As a non-resident without CPF: You pay 15% IRRF on gross rental income directly at source.
            Getting a CPF allows you to use the progressive rates (potentially lower for lower rents)
            and deduct expenses.
          </div>
        )}

        {deal.buyerProfile.isCompanyPurchase && (
          <div className="bg-green-100 rounded-lg p-3 text-xs text-green-800">
            ✅ Company purchase (PJ Lucro Presumido): ~11.33% effective tax rate on rental income,
            which can be significantly lower than personal progressive rates on high income.
            Consult a Brazilian accountant (contador) to set up the structure.
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Important Notes</p>
        <ul className="space-y-1 text-blue-700">
          <li>• Costs are estimates. Final amounts may vary based on actual negotiation and municipality.</li>
          <li>• IPTU is estimated from market price. Request actual IPTU carnê from seller.</li>
          <li>• Broker commission (6% standard) is typically paid by the seller and factored into the asking price.</li>
          <li>• All amounts in Brazilian Reais (BRL). Exchange rate for reference only.</li>
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
