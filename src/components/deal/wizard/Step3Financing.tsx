'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { BRAZIL_SELIC_RATE, ISRAEL_PRIME_RATE, USA_FED_RATE, USA_30YR_FIXED, CURRENCIES } from '@/lib/constants/countries';
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

  const market = property.country ?? 'BR';
  const isIsrael = market === 'IL';
  const isUSA = market === 'US';
  const currencySymbol = CURRENCIES[property.currency]?.symbol ?? 'R$';
  const benchmarkRate = isIsrael ? ISRAEL_PRIME_RATE : isUSA ? USA_FED_RATE : BRAZIL_SELIC_RATE;
  const benchmarkLabel = isIsrael ? 'Prime Rate' : isUSA ? 'Fed Rate' : 'Selic';

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

  // Validation warnings — market-aware
  const warnings: { field: string; msg: string; level: 'error' | 'warn' }[] = [];
  if (financing.financingType !== 'cash') {
    const minDown = isIsrael ? 25 : isUSA ? 20 : 20;
    if (financing.downPaymentPercent < minDown)
      warnings.push({
        field: 'downPayment',
        msg: isIsrael
          ? `Israeli banks require minimum 25% down for investment properties (30% for non-residents).`
          : isUSA
          ? 'US lenders typically require 20-25% down for investment properties. PMI required if below 20%.'
          : 'Caixa requires minimum 20% down for resale properties. Some private banks require 30%.',
        level: 'warn',
      });
    if (isUSA && financing.downPaymentPercent < 20)
      warnings.push({
        field: 'pmi',
        msg: 'PMI (private mortgage insurance) required — adds ~0.5-1%/yr to cost. Drops off at 20% equity.',
        level: 'warn',
      });
    if (financing.downPaymentAmount >= price && price > 0)
      warnings.push({ field: 'downPayment', msg: 'Down payment equals or exceeds the purchase price — consider Cash instead.', level: 'error' });
    if (isIsrael) {
      if (financing.interestRate > 8)
        warnings.push({ field: 'interestRate', msg: `Rate above 8%/year is high for Israel. Bank prime route is currently ${benchmarkRate}%.`, level: 'warn' });
      if (financing.interestRate < 2 && financing.interestRate > 0)
        warnings.push({ field: 'interestRate', msg: 'Rate below 2%/year is unusually low for Israel.', level: 'warn' });
    } else if (isUSA) {
      if (financing.interestRate > 10)
        warnings.push({ field: 'interestRate', msg: `Rate above 10%/year is high for US. 30-yr fixed is currently ~${USA_30YR_FIXED}%.`, level: 'warn' });
      if (financing.interestRate < 3 && financing.interestRate > 0)
        warnings.push({ field: 'interestRate', msg: 'Rate below 3%/year is unusually low for US. Current market: ~6.5-7%.', level: 'warn' });
    } else {
      if (financing.interestRate > 15)
        warnings.push({ field: 'interestRate', msg: 'Interest rate above 15%/year is very high. Current Caixa rates: 10–11.5% + TR.', level: 'warn' });
      if (financing.interestRate < 5 && financing.interestRate > 0)
        warnings.push({ field: 'interestRate', msg: 'Interest rate below 5%/year is unusually low for Brazil.', level: 'warn' });
    }
    if (monthlyPayment > 0 && price > 0) {
      const paymentToPrice = (monthlyPayment / price) * 100;
      if (paymentToPrice > 2)
        warnings.push({ field: 'payment', msg: 'Monthly payment is over 2% of property value — verify loan terms.', level: 'warn' });
    }
  }

  const warn = (field: string) => {
    const w = warnings.find(w => w.field === field);
    if (!w) return null;
    return (
      <p className={`text-xs mt-1.5 ${w.level === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
        {w.level === 'error' ? '✕' : '⚠'} {w.msg}
      </p>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Financing Structure</h2>
        <p className="text-slate-500 mt-1">How are you paying for this property?</p>
      </div>

      {/* Financing type */}
      <div className="grid grid-cols-3 gap-3">
        {(isUSA
          ? [
              { value: 'cash', label: '💵 Cash', desc: 'Full payment' },
              { value: 'mortgage', label: '🏦 Conventional', desc: '30/15-yr fixed, ARM' },
              { value: 'private-bank', label: '📊 DSCR Loan', desc: 'Debt-service coverage ratio' },
            ]
          : isIsrael
          ? [
              { value: 'cash', label: '💵 Cash', desc: 'Full payment' },
              { value: 'bank', label: '🏦 Bank Mortgage', desc: 'Hapoalim, Leumi, Discount...' },
              { value: 'private-bank', label: '🏛️ Non-Bank Lender', desc: 'Insurance company / NBFI' },
            ]
          : [
              { value: 'cash', label: '💵 Cash', desc: 'Full payment' },
              { value: 'caixa', label: '🏦 Caixa', desc: 'Caixa Econômica' },
              { value: 'private-bank', label: '🏛️ Private Bank', desc: 'Bradesco, Itaú, etc.' },
            ]
        ).map((opt) => (
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
            <h3 className="font-semibold text-slate-700">{isIsrael ? 'Down Payment (הון עצמי)' : isUSA ? 'Down Payment' : 'Down Payment (Entrada)'}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Amount ({currencySymbol})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{currencySymbol}</span>
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
                {isIsrael
                  ? '⚠️ Israeli banks allow max 75% LTV for investment properties, 70% for non-residents. Your LTV exceeds this.'
                  : isUSA
                  ? '⚠️ US lenders typically allow max 75-80% LTV for investment properties. PMI required below 20% equity.'
                  : '⚠️ Brazilian banks (Caixa) typically finance up to 80% for resale properties and 70% for some private banks.'}
              </p>
            )}
            {warn('downPayment')}
            {warn('pmi')}

            {/* Brazil-specific: FGTS + MCMV */}
            {!isIsrael && !isUSA && (
              <>
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
              </>
            )}

            {/* US-specific: loan type info */}
            {isUSA && (
              <div className="border-t border-slate-100 pt-4 bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">US loan options for investment properties:</p>
                  <p>• <strong>Conventional (30-yr fixed):</strong> ~{USA_30YR_FIXED}%. Most common. Requires 620+ credit score.</p>
                  <p>• <strong>15-yr fixed:</strong> ~0.5-0.75% lower rate, higher payment. Builds equity faster.</p>
                  <p>• <strong>5/1 ARM:</strong> Lower initial rate (~6%), adjusts after 5 years. Useful if planning to sell/refi.</p>
                  <p>• <strong>DSCR loan:</strong> Qualifies based on rental income (DSCR ≥1.2). No personal income required.</p>
                  <p className="text-blue-600 mt-1">💡 Foreign nationals: DSCR loans or portfolio lenders. Get pre-approval before making an offer.</p>
                </div>
              </div>
            )}

            {/* Israel-specific: mortgage route info */}
            {isIsrael && (
              <div className="border-t border-slate-100 pt-4 bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Israeli mortgage tracks:</p>
                  <p>• <strong>Prime-linked (variable):</strong> Prime ({ISRAEL_PRIME_RATE}%) + spread (~1.5%). Tracks Bank of Israel rate.</p>
                  <p>• <strong>Fixed rate (ribit kvua):</strong> ~4.5-6%/yr. Predictable, higher rate.</p>
                  <p>• <strong>CPI-linked (madad):</strong> ~2-3% + inflation indexation. Lower rate, but principal grows with CPI.</p>
                  <p className="text-blue-600 mt-1">💡 Most Israeli mortgages are a blend of tracks. Consult a mortgage advisor (yoetz mashkanta).</p>
                </div>
              </div>
            )}
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
                  {isIsrael
                    ? `Prime + spread: ~${benchmarkRate}% + 1.5-2%. Fixed track: ~4.5-6%. ${benchmarkLabel}: ${benchmarkRate}%`
                    : isUSA
                    ? `30-yr fixed: ~${USA_30YR_FIXED}%. ${benchmarkLabel}: ${benchmarkRate}%. DSCR loans: ~7-8%.`
                    : `Caixa typical: 10-11.5% + TR. ${benchmarkLabel}: ${benchmarkRate}%`}
                </p>
                {warn('interestRate')}
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

            {/* Amortization / loan type */}
            {!isIsrael && !isUSA && (
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">
                  Amortization System
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'SAC', label: 'SAC', desc: 'Decreasing payments. More interest early but lower total.' },
                    { value: 'PRICE', label: 'PRICE (French)', desc: 'Fixed monthly payments. More predictable.' },
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
            )}
            {isUSA && (
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">
                  Loan Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'fixed', label: '30-yr Fixed', desc: 'Most common. Predictable payments for 30 years.' },
                    { value: 'PRICE', label: '15-yr Fixed', desc: 'Lower rate, higher payment. Pays off faster.' },
                    { value: 'adjustable', label: '5/1 ARM', desc: 'Fixed 5 yrs, then adjusts. Good if refi/sell planned.' },
                    { value: 'variable', label: 'DSCR / Portfolio', desc: 'Income-based. No personal income verification.' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update({ loanType: s.value as typeof financing.loanType })}
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
            )}
            {isIsrael && (
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">
                  Mortgage Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'fixed', label: 'Fixed Rate', desc: 'Fixed interest for full term (ribit kvua).' },
                    { value: 'variable', label: 'Prime-Linked', desc: 'Prime + spread — variable with Bank of Israel rate.' },
                    { value: 'adjustable', label: 'CPI-Linked', desc: 'Lower rate but principal indexed to inflation (madad).' },
                    { value: 'PRICE', label: 'Mixed Tracks', desc: 'Blend of routes — most common in Israel.' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update({ loanType: s.value as typeof financing.loanType })}
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
            )}
          </div>

          {/* Monthly payment preview */}
          {monthlyPayment > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-700">Estimated Monthly Payment</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(monthlyPayment, property.currency)}
                  </div>
                  {financing.loanType === 'SAC' && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      First payment (SAC decreases over time)
                    </div>
                  )}
                  {warn('payment')}
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-700">Loan Amount</div>
                  <div className="font-semibold text-blue-900">{formatCurrency(loanAmount, property.currency)}</div>
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
            Full cash payment of {formatCurrency(price, property.currency)}.
            No mortgage fees, no LTV restrictions, stronger negotiating position.
            {isUSA && ' Consider wire transfer or certified funds — personal checks typically not accepted at closing.'}
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
