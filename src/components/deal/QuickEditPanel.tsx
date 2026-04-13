'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency } from '@/lib/utils/formatters';
import { useDealStore } from '@/lib/store/dealStore';
import { X, RefreshCw, Sliders } from 'lucide-react';

interface Props {
  deal: Deal;
  onClose: () => void;
  onReanalyzed: () => void;
}

export function QuickEditPanel({ deal, onClose, onReanalyzed }: Props) {
  const { updateDeal, saveDeal, setAnalysis, setAnalyzing, setAnalysisError } = useDealStore();
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const currency = deal.property.currency ?? 'BRL';
  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : 'R$';

  const [form, setForm] = useState({
    price: price,
    monthlyRent: deal.rentalAssumptions.ltr.monthlyRent,
    vacancyRate: deal.rentalAssumptions.ltr.vacancyRatePercent,
    rentGrowth: deal.rentalAssumptions.ltr.annualRentGrowthPercent,
    interestRate: deal.financing.interestRate,
    downPaymentPercent: deal.financing.downPaymentPercent,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const field = (
    label: string,
    key: keyof typeof form,
    opts: { prefix?: string; suffix?: string; min?: number; max?: number; step?: number }
  ) => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="relative">
        {opts.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{opts.prefix}</span>
        )}
        <input
          type="number"
          value={form[key]}
          min={opts.min}
          max={opts.max}
          step={opts.step ?? 1}
          onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))}
          className={`w-full border border-slate-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${opts.prefix ? 'pl-8 pr-3' : opts.suffix ? 'pl-3 pr-8' : 'px-3'}`}
        />
        {opts.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{opts.suffix}</span>
        )}
      </div>
    </div>
  );

  const handleReanalyze = async () => {
    setLoading(true);
    setError('');

    // Apply edits to deal
    const updatedDeal: Deal = {
      ...deal,
      property: {
        ...deal.property,
        agreedPrice: form.price,
        askingPrice: deal.property.askingPrice,
      },
      rentalAssumptions: {
        ...deal.rentalAssumptions,
        ltr: {
          ...deal.rentalAssumptions.ltr,
          monthlyRent: form.monthlyRent,
          vacancyRatePercent: form.vacancyRate,
          annualRentGrowthPercent: form.rentGrowth,
        },
      },
      financing: {
        ...deal.financing,
        interestRate: form.interestRate,
        downPaymentPercent: form.downPaymentPercent,
        downPaymentAmount: form.price * (form.downPaymentPercent / 100),
        loanAmount: form.price * (1 - form.downPaymentPercent / 100),
      },
    };

    updateDeal(updatedDeal);

    try {
      setAnalyzing(true);
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDeal),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAnalysis(json.analysis);
      saveDeal();
      onReanalyzed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const hasChanges =
    form.price !== price ||
    form.monthlyRent !== deal.rentalAssumptions.ltr.monthlyRent ||
    form.vacancyRate !== deal.rentalAssumptions.ltr.vacancyRatePercent ||
    form.rentGrowth !== deal.rentalAssumptions.ltr.annualRentGrowthPercent ||
    form.interestRate !== deal.financing.interestRate ||
    form.downPaymentPercent !== deal.financing.downPaymentPercent;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-slate-800">Quick Edit Assumptions</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Price</p>
            <div className="grid grid-cols-1 gap-3">
              {field('Purchase price', 'price', { prefix: currencySymbol, min: 0, step: 10000 })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rental</p>
            <div className="grid grid-cols-2 gap-3">
              {field('Monthly rent', 'monthlyRent', { prefix: currencySymbol, min: 0, step: 100 })}
              {field('Vacancy rate', 'vacancyRate', { suffix: '%', min: 0, max: 50, step: 0.5 })}
              {field('Annual rent growth', 'rentGrowth', { suffix: '%', min: 0, max: 20, step: 0.5 })}
            </div>
          </div>

          {deal.financing.financingType !== 'cash' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Financing</p>
              <div className="grid grid-cols-2 gap-3">
                {field('Interest rate', 'interestRate', { suffix: '%/yr', min: 0, max: 30, step: 0.1 })}
                {field('Down payment', 'downPaymentPercent', { suffix: '%', min: 5, max: 100, step: 1 })}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Down: {formatCurrency(form.price * form.downPaymentPercent / 100, currency, true)} ·
                Loan: {formatCurrency(form.price * (1 - form.downPaymentPercent / 100), currency, true)}
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleReanalyze}
            disabled={loading || !hasChanges}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {loading ? 'Re-analyzing…' : 'Re-analyze'}
          </button>
        </div>
      </div>
    </div>
  );
}
