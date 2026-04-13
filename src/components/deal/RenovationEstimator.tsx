'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { formatCurrency } from '@/lib/utils/formatters';
import { CurrencyCode } from '@/lib/types/deal';

type RenovationLevel = 'none' | 'light' | 'standard' | 'full' | 'custom';

// Brazil: R$/m² estimates
const BR_LEVELS: { id: RenovationLevel; label: string; desc: string; ratePerSqm: number; color: string }[] = [
  { id: 'none', label: '✨ No renovation', desc: 'Move-in ready', ratePerSqm: 0, color: 'border-slate-200' },
  { id: 'light', label: '🖌️ Light refresh', desc: 'Paint, fixtures, deep clean', ratePerSqm: 400, color: 'border-blue-300' },
  { id: 'standard', label: '🔨 Standard', desc: 'Kitchen + bathrooms, flooring', ratePerSqm: 900, color: 'border-amber-400' },
  { id: 'full', label: '🏗️ Full renovation', desc: 'Complete gut + replumb/rewire', ratePerSqm: 1800, color: 'border-orange-500' },
  { id: 'custom', label: '✏️ Custom amount', desc: 'Enter your own estimate', ratePerSqm: 0, color: 'border-purple-400' },
];

// Israel: ₪/m² estimates (2025 — Israeli construction costs are high)
const IL_LEVELS: { id: RenovationLevel; label: string; desc: string; ratePerSqm: number; color: string }[] = [
  { id: 'none', label: '✨ No renovation', desc: 'Move-in ready', ratePerSqm: 0, color: 'border-slate-200' },
  { id: 'light', label: '🖌️ Light refresh', desc: 'Paint, fixtures, cleaning', ratePerSqm: 1500, color: 'border-blue-300' },
  { id: 'standard', label: '🔨 Standard', desc: 'Kitchen + bathrooms, flooring', ratePerSqm: 4000, color: 'border-amber-400' },
  { id: 'full', label: '🏗️ Full renovation', desc: 'Complete renovation (שיפוץ כולל)', ratePerSqm: 8000, color: 'border-orange-500' },
  { id: 'custom', label: '✏️ Custom amount', desc: 'Enter your own estimate', ratePerSqm: 0, color: 'border-purple-400' },
];

// US: $/m² estimates (2025 — varies widely by state/market)
const US_LEVELS: { id: RenovationLevel; label: string; desc: string; ratePerSqm: number; color: string }[] = [
  { id: 'none', label: '✨ No renovation', desc: 'Move-in ready / turnkey', ratePerSqm: 0, color: 'border-slate-200' },
  { id: 'light', label: '🖌️ Light refresh', desc: 'Paint, fixtures, landscaping', ratePerSqm: 250, color: 'border-blue-300' },
  { id: 'standard', label: '🔨 Standard', desc: 'Kitchen + bathrooms, flooring', ratePerSqm: 650, color: 'border-amber-400' },
  { id: 'full', label: '🏗️ Full renovation', desc: 'Complete gut + systems (fixer-upper)', ratePerSqm: 1400, color: 'border-orange-500' },
  { id: 'custom', label: '✏️ Custom amount', desc: 'Enter your own estimate', ratePerSqm: 0, color: 'border-purple-400' },
];

interface Props {
  onClose?: () => void;
}

export function RenovationEstimator({ onClose }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  if (!currentDeal) return null;

  const { property, userOverrides } = currentDeal;
  const isIsrael = property.country === 'IL';
  const isUSA = property.country === 'US';
  const currency = (property.currency ?? 'BRL') as CurrencyCode;
  const currencySymbol = isIsrael ? '₪' : isUSA ? '$' : 'R$';
  const LEVELS = isIsrael ? IL_LEVELS : isUSA ? US_LEVELS : BR_LEVELS;
  const currentRenovation = userOverrides.customRenovation ?? 0;
  const sizeSqm = property.sizeSqm || 80;

  const getActiveLevel = (): RenovationLevel => {
    if (currentRenovation === 0) return 'none';
    for (const l of LEVELS) {
      if (l.id !== 'none' && l.id !== 'custom' && Math.abs(currentRenovation - l.ratePerSqm * sizeSqm) < 500) return l.id;
    }
    return 'custom';
  };

  const activeLevel = getActiveLevel();

  const selectLevel = (level: RenovationLevel) => {
    if (level === 'custom') return;
    const rate = LEVELS.find(l => l.id === level)!.ratePerSqm;
    updateDeal({ userOverrides: { ...userOverrides, customRenovation: rate * sizeSqm } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-700">Renovation Budget Estimator</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Property: {sizeSqm}m² · Select a renovation level or enter a custom amount
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {LEVELS.filter(l => l.id !== 'custom').map((level) => {
          const amount = level.ratePerSqm * sizeSqm;
          const isActive = activeLevel === level.id;
          return (
            <button
              key={level.id}
              onClick={() => selectLevel(level.id)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${isActive ? level.color + ' bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="text-sm font-semibold text-slate-800">{level.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{level.desc}</div>
              {level.ratePerSqm > 0 ? (
                <div className="text-sm font-bold text-slate-700 mt-1.5">
                  {formatCurrency(amount, currency, true)}
                  <span className="text-xs font-normal text-slate-400 ml-1">({formatCurrency(level.ratePerSqm, currency)}/m²)</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400 mt-1.5">{currencySymbol} 0</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div>
        <label className="text-sm font-medium text-slate-600 block mb-1.5">Custom amount ({currencySymbol})</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{currencySymbol}</span>
          <input
            type="number"
            step="1000"
            min="0"
            value={currentRenovation || ''}
            placeholder="Enter renovation budget"
            onChange={(e) => updateDeal({ userOverrides: { ...userOverrides, customRenovation: parseFloat(e.target.value) || 0 } })}
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {currentRenovation > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
          <div className="font-semibold text-blue-800">
            {formatCurrency(currentRenovation, currency, true)} renovation budget added to purchase costs
          </div>
          <div className="text-blue-600 text-xs mt-0.5">
            This will be included in Total Cash Required and affects your Cash-on-Cash return.
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
        {isUSA ? (
          <><strong>US context:</strong> Rates above are national averages. NYC, SF, and high-cost metros can be 2–3× higher.
          Sun Belt markets (FL, TX, AZ) are typically 20–30% lower.
          Get 3+ licensed contractor bids. Factor in permit costs and potential lead paint/asbestos remediation for pre-1978 homes.</>
        ) : isIsrael ? (
          <><strong>Israel context:</strong> Rates above are estimates for the Tel Aviv area.
          Jerusalem and Haifa are similar. Peripheral cities: subtract 20–30%.
          Always get 3 quotes from licensed contractors (קבלן שיפוצים). Include VAT (17% מע&quot;מ) in your budget.</>
        ) : (
          <><strong>Brazil context:</strong> Rates above are estimates for São Paulo.
          Rio de Janeiro and other capitals are similar. Interior cities: subtract 20–30%.
          Always get at least 3 quotes from local contractors (empreiteiros) before purchasing.</>
        )}
      </div>
    </div>
  );
}
