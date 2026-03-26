'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { BRAZIL_SELIC_RATE } from '@/lib/constants/countries';
import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step3Financing({ onNext, onBack }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  const financing = currentDeal?.financing;
  const property = currentDeal?.property;

  if (!financing || !property) return null;

  const price = property.agreedPrice || property.askingPrice;

  const update = (updates: Partial<typeof financing>) => {
    const merged = { ...financing, ...updates };
    // Auto-calculate derived values
    if (updates.downPaymentPercent !== undefined) {
      merged.downPaymentAmount = price * (updates.downPaymentPercent / 100);
      merged.loanAmount = price - merged.downPaymentAmount;
    }
    if (updates.downPaymentAmount !== undefined) {
      merged.downPaymentPercent = price > 0 ? (updates.downPaymentAmount / price) * 100 : 0;
      merged.loanAmount = price - updates.downPaymentAmount;
    }
    updateDeal({ financing: merged });
  };

  const loanAmount = price - financing.downPaymentAmount;
  const ltv = price > 0 ? (loanAmount / price) * 100 : 0;

  // Monthly payment estimate
  const monthlyRate = financing.interestRate / 100 / 12;
  const n = financing.loanTermYears * 12;
  const monthlyPayment = financing.financingType !== 'cash' && monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : 0;

  const canProceed = financing.financingType === 'cash' || financing.downPaymentAmount > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Financing Structure</h2>
        <p className="text-slate-500 mt-1">How are you paying for this property?</p>
      </div>

      {/* Financing type */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: 'cash', label: '💵 Cash', desc: 'Full payment' },
          { value: 'caixa', label: '🏦 Caixa', desc: 'Caixa Econômica' },
          { value: 'private-bank', label: '🏛️ Private Bank', desc: 'Bradesco, Itaú, etc.' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => update({ financingType: opt.value as typeof financing.financingType })}
            className={`p-4 rounded-xl border-2 text-center transition-all ${
              financing.financingType === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="text-lg mb-1">{opt.label.split(' ')[0]}</div>
            <div className="font-medium text-slate-800 text-sm">{opt.label.split(' ').slice(1).join(' ')}</div>
            <div className="text-xs text-slate-500">{opt.desc}</div>
          </button>
        ))}
      </div>

      {financing.financingType !== 'cash' && (
        <>
          {/* Down payment */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-700">Down Payment (Entrada)</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Amount (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input
                    type="number"
                    value={financing.downPaymentAmount || ''}
                    onChange={(e) => update({ downPaymentAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Percentage</label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="5"
                    value={financing.downPaymentPercent.toFixed(0)}
                    onChange={(e) => update({ downPaymentPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* LTV indicator */}
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Loan-to-Value (LTV)</span>
              <span className={`font-semibold ${ltv > 80 ? 'text-orange-600' : 'text-slate-800'}`}>
                {ltv.toFixed(0)}%
              </span>
            </div>

            {ltv > 80 && (
              <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                ⚠️ Brazilian banks (Caixa) typically finance up to 80% for resale properties and 70% for some private banks.
                Higher LTV may not be available.
              </p>
            )}

            {/* FGTS */}
            <div className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={financing.usesFGTS}
                  onChange={(e) => update({ usesFGTS: e.target.checked })}
                  className="w-4 h-4 accent-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Use FGTS for down payment</div>
                  <div className="text-xs text-slate-500">
                    Workers' severance fund — can be used for primary residence in Brazil
                  </div>
                </div>
              </label>
              {financing.usesFGTS && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-slate-600 block mb-1.5">FGTS balance (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <input
                      type="number"
                      value={financing.fgtsAmount || ''}
                      onChange={(e) => update({ fgtsAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* MCMV */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={financing.financedByMCMV}
                onChange={(e) => update({ financedByMCMV: e.target.checked })}
                className="w-4 h-4 accent-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">Minha Casa Minha Vida</div>
                <div className="text-xs text-slate-500">Government housing program — subsidized rates</div>
              </div>
            </label>
          </div>

          {/* Loan terms */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-700">Loan Terms</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">
                  Interest Rate (% per year)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="25"
                    value={financing.interestRate}
                    onChange={(e) => update({ interestRate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Caixa typical: 10-11.5% + TR. Selic: {BRAZIL_SELIC_RATE}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Term (years)</label>
                <select
                  value={financing.loanTermYears}
                  onChange={(e) => update({ loanTermYears: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[10, 15, 20, 25, 30, 35].map((y) => (
                    <option key={y} value={y}>{y} years</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amortization type */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Amortization System
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: 'SAC',
                    label: 'SAC',
                    desc: 'Decreasing payments. More interest in early years but total interest is lower.',
                  },
                  {
                    value: 'PRICE',
                    label: 'PRICE (French)',
                    desc: 'Fixed monthly payments. More predictable but higher total interest.',
                  },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ loanType: s.value as 'SAC' | 'PRICE' })}
                    className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${
                      financing.loanType === s.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{s.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly payment preview */}
          {monthlyPayment > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-700">Estimated Monthly Payment</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(monthlyPayment, 'BRL')}
                  </div>
                  {financing.loanType === 'SAC' && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      First payment (SAC decreases over time)
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-700">Loan Amount</div>
                  <div className="font-semibold text-blue-900">{formatCurrency(loanAmount, 'BRL')}</div>
                  <div className="text-xs text-blue-600">{ltv.toFixed(0)}% LTV</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {financing.financingType === 'cash' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          <div className="font-semibold">Cash Purchase</div>
          <p className="text-sm mt-1">
            Full cash payment of {formatCurrency(price, 'BRL')}.
            No mortgage fees, no LTV restrictions, stronger negotiating position.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          Continue to Rental Strategy
        </button>
      </div>
    </div>
  );
}
