'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { PropertyType, PurchaseStrategy, ConditionType } from '@/lib/types/deal';
import { BR_STATES, US_STATES, CURRENCIES } from '@/lib/constants/countries';
import { RenovationEstimator } from '@/components/deal/RenovationEstimator';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step2Property({ onNext, onBack }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  const property = currentDeal?.property;

  if (!property) return null;

  const market = property.country ?? 'BR';
  const isIsrael = market === 'IL';
  const isUSA = market === 'US';
  const currencySymbol = CURRENCIES[property.currency]?.symbol ?? 'R$';

  const update = (updates: Partial<typeof property>) => {
    updateDeal({ property: { ...property, ...updates } });
  };

  const price = property.agreedPrice || property.askingPrice;
  const pricePerSqm = property.sizeSqm > 0 ? price / property.sizeSqm : 0;

  const canProceed =
    property.askingPrice > 0 &&
    property.sizeSqm > 0 &&
    property.city.length > 0;

  // Validation warnings (non-blocking) — market-aware
  const warnings: { field: string; msg: string; level: 'error' | 'warn' }[] = [];
  if (isIsrael) {
    if (property.askingPrice > 0 && property.askingPrice < 500_000)
      warnings.push({ field: 'askingPrice', msg: 'Price below ₪500K is unusual for Israeli real estate.', level: 'warn' });
    if (property.askingPrice > 20_000_000)
      warnings.push({ field: 'askingPrice', msg: 'Price above ₪20M — double-check the value.', level: 'warn' });
    if (pricePerSqm > 0 && pricePerSqm < 8_000)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² below ₪8,000 is unusually low for Israel.', level: 'warn' });
    if (pricePerSqm > 120_000)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² above ₪120K — verify (top Tel Aviv can reach ₪80-100K).', level: 'warn' });
  } else if (isUSA) {
    if (property.askingPrice > 0 && property.askingPrice < 50_000)
      warnings.push({ field: 'askingPrice', msg: 'Price below $50K is unusual for US real estate.', level: 'warn' });
    if (property.askingPrice > 20_000_000)
      warnings.push({ field: 'askingPrice', msg: 'Price above $20M — double-check the value.', level: 'warn' });
    if (pricePerSqm > 0 && pricePerSqm < 500)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² below $500 is unusually low — verify.', level: 'warn' });
    if (pricePerSqm > 25_000)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² above $25K — verify (Manhattan luxury can reach $20K+/m²).', level: 'warn' });
  } else {
    if (property.askingPrice > 0 && property.askingPrice < 50_000)
      warnings.push({ field: 'askingPrice', msg: 'Price seems very low for Brazilian real estate.', level: 'warn' });
    if (property.askingPrice > 15_000_000)
      warnings.push({ field: 'askingPrice', msg: 'Price above R$15M — double-check the value.', level: 'warn' });
    if (pricePerSqm > 0 && pricePerSqm < 1000)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² below R$1,000 is unusually low for Brazil.', level: 'warn' });
    if (pricePerSqm > 60_000)
      warnings.push({ field: 'pricePerSqm', msg: 'Price per m² above R$60K — verify (e.g. Leblon/Ipanema can reach R$25-35K).', level: 'warn' });
  }
  if (property.sizeSqm > 0 && property.sizeSqm < 15)
    warnings.push({ field: 'sizeSqm', msg: 'Size below 15m² is unusual — verify.', level: 'warn' });
  if (property.sizeSqm > 2000)
    warnings.push({ field: 'sizeSqm', msg: 'Size above 2,000m² — is this correct?', level: 'warn' });
  if (property.agreedPrice && property.agreedPrice > property.askingPrice * 1.05)
    warnings.push({ field: 'agreedPrice', msg: 'Agreed price is higher than asking price — unusual.', level: 'warn' });
  if (property.yearBuilt && (property.yearBuilt < 1850 || property.yearBuilt > new Date().getFullYear() + 5))
    warnings.push({ field: 'yearBuilt', msg: `Year built must be between 1850 and ${new Date().getFullYear() + 5}.`, level: 'error' });

  const warn = (field: string) => {
    const w = warnings.find(w => w.field === field);
    if (!w) return null;
    return (
      <p className={`text-xs mt-1 ${w.level === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
        {w.level === 'error' ? '✕' : '⚠'} {w.msg}
      </p>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Property Details</h2>
        <p className="text-slate-500 mt-1">Tell us about the property you want to analyze.</p>
      </div>

      {/* Location */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Location</h3>

        <div className="grid grid-cols-2 gap-4">
          {!isIsrael && (
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">State</label>
              <select
                value={property.state}
                onChange={(e) => update({ state: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isUSA
                  ? Object.entries(US_STATES).map(([code, s]) => (
                      <option key={code} value={code}>{code} — {s.name}</option>
                    ))
                  : Object.entries(BR_STATES).map(([code, s]) => (
                      <option key={code} value={code}>{code} — {s.name}</option>
                    ))
                }
              </select>
            </div>
          )}
          <div className={isIsrael ? 'col-span-2' : ''}>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">City *</label>
            <input
              type="text"
              placeholder={isIsrael ? 'e.g. Tel Aviv, Jerusalem, Haifa' : isUSA ? 'e.g. Miami, Orlando, Austin' : 'e.g. São Paulo'}
              value={property.city}
              onChange={(e) => update({ city: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1.5">Neighborhood</label>
          <input
            type="text"
            placeholder={isIsrael ? 'e.g. Florentin, Neve Tzedek, German Colony...' : isUSA ? 'e.g. Brickell, South Beach, Downtown...' : 'e.g. Itaim Bibi, Leblon, Savassi...'}
            value={property.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1.5">Address (optional)</label>
          <input
            type="text"
            placeholder="Street address"
            value={property.address}
            onChange={(e) => update({ address: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Property specs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Property Specifications</h3>

        {/* Type */}
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-2">Property Type</label>
          <div className="flex flex-wrap gap-2">
            {(['apartment', 'house', 'condo', 'studio', 'commercial', 'land'] as PropertyType[]).map((type) => (
              <button
                key={type}
                onClick={() => update({ propertyType: type })}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                  property.propertyType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-2">Purchase Strategy</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'buy-to-let', label: 'Buy to Rent' },
              { value: 'buy-to-sell', label: 'Buy to Sell' },
              { value: 'primary-residence', label: 'Live in it' },
              { value: 'vacation', label: 'Vacation Home' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => update({ purchaseStrategy: s.value as PurchaseStrategy })}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  property.purchaseStrategy === s.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Size (sqm) *</label>
            <input
              type="number"
              placeholder="85"
              value={property.sizeSqm || ''}
              onChange={(e) => update({ sizeSqm: parseFloat(e.target.value) || 0 })}
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${warnings.find(w => w.field === 'sizeSqm') ? 'border-amber-400' : 'border-slate-300'}`}
            />
            {warn('sizeSqm')}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Rooms</label>
            <select
              value={property.rooms}
              onChange={(e) => update({ rooms: parseInt(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'room' : 'rooms'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Bathrooms</label>
            <select
              value={property.bathrooms}
              onChange={(e) => update({ bathrooms: parseInt(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Parking</label>
            <select
              value={property.parkingSpaces}
              onChange={(e) => update({ parkingSpaces: parseInt(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n === 0 ? 'None' : n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">Year Built</label>
            <input
              type="number"
              placeholder="2010"
              value={property.yearBuilt || ''}
              onChange={(e) => update({ yearBuilt: parseInt(e.target.value) || undefined })}
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${warnings.find(w => w.field === 'yearBuilt') ? 'border-red-400' : 'border-slate-300'}`}
            />
            {warn('yearBuilt')}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-2">Condition</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'new', label: '✨ New' },
              { value: 'excellent', label: '⭐ Excellent' },
              { value: 'good', label: '👍 Good' },
              { value: 'needs-work', label: '🔧 Needs Work' },
              { value: 'renovation', label: '🏗️ Renovation' },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => update({ condition: c.value as ConditionType })}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  property.condition === c.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Pricing</h3>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1.5">
            Asking Price ({currencySymbol}) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currencySymbol}</span>
            <input
              type="number"
              placeholder={isIsrael ? '2000000' : '750000'}
              value={property.askingPrice || ''}
              onChange={(e) => update({ askingPrice: parseFloat(e.target.value) || 0 })}
              className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${warnings.find(w => w.field === 'askingPrice') ? 'border-amber-400' : 'border-slate-300'}`}
            />
            {warn('askingPrice')}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1.5">
            Agreed/Negotiated Price ({currencySymbol}) <span className="text-slate-400 font-normal">— leave blank if same as asking</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{currencySymbol}</span>
            <input
              type="number"
              placeholder="Same as asking price"
              value={property.agreedPrice || ''}
              onChange={(e) => update({ agreedPrice: parseFloat(e.target.value) || undefined })}
              className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${warnings.find(w => w.field === 'agreedPrice') ? 'border-amber-400' : 'border-slate-300'}`}
            />
            {warn('agreedPrice')}
          </div>
        </div>

        {pricePerSqm > 0 && (
          <div className={`rounded-lg px-4 py-3 ${warnings.find(w => w.field === 'pricePerSqm') ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
            <span className="text-sm text-slate-600">Price per sqm: </span>
            <span className="font-semibold text-slate-800">
              {currencySymbol}{pricePerSqm.toLocaleString(undefined, { maximumFractionDigits: 0 })}/m²
            </span>
            {warn('pricePerSqm')}
          </div>
        )}
      </div>

      {/* Market-specific property details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">
          {isIsrael ? 'Israeli Property Details' : isUSA ? 'US Property Details' : 'Brazilian Property Details'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">
              {isIsrael ? 'Arnona (monthly, ₪)' : isUSA ? 'Property Tax (annual, $)' : 'IPTU (annual, R$)'}
            </label>
            <input
              type="number"
              placeholder="Auto-estimated"
              value={isIsrael
                ? (property.marketSpecific?.arnona || '')
                : (property.iptuAnnual || '')}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || undefined;
                if (isIsrael) {
                  update({ marketSpecific: { ...property.marketSpecific, arnona: val } });
                } else {
                  update({ iptuAnnual: val });
                }
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isIsrael && (
              <p className="text-xs text-slate-400 mt-1">Arnona varies by city: ₪35-95/m²/year</p>
            )}
            {isUSA && (
              <p className="text-xs text-slate-400 mt-1">State average auto-estimated if blank (e.g. FL ~1%, TX ~1.7%)</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">
              {isIsrael ? 'Vaad Bayit (monthly, ₪)' : isUSA ? 'HOA / Condo Fee (monthly, $)' : 'Condomínio (monthly, R$)'}
            </label>
            <input
              type="number"
              placeholder={isUSA ? '0 if no HOA' : 'Auto-estimated'}
              value={isIsrael
                ? (property.marketSpecific?.vaadBayit || '')
                : (property.condominiumMonthly || '')}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || undefined;
                if (isIsrael) {
                  update({ marketSpecific: { ...property.marketSpecific, vaadBayit: val } });
                } else {
                  update({ condominiumMonthly: val });
                }
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isUSA && (
              <p className="text-xs text-slate-400 mt-1">Review HOA financials & reserve fund before closing.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {!isIsrael && !isUSA && (
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={property.hasHabitese ?? true}
                onChange={(e) => update({ hasHabitese: e.target.checked })}
                className="w-4 h-4 accent-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">Has Habite-se</div>
                <div className="text-xs text-slate-500">Occupancy permit</div>
              </div>
            </label>
          )}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={property.isNewDevelopment}
              onChange={(e) => update({ isNewDevelopment: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-700">
                {isUSA ? 'New Construction / Pre-sale' : 'New Development'}
              </div>
              <div className="text-xs text-slate-500">
                {isIsrael ? 'Dira mitoch dira / off-plan' : isUSA ? 'Builder sale or pre-construction' : 'Off-plan or launch'}
              </div>
            </div>
          </label>
        </div>

        {/* Broker commission */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={(currentDeal?.userOverrides.customBrokerFee ?? 0) > 0}
              onChange={(e) => {
                const p = property.agreedPrice || property.askingPrice || 0;
                const rate = isIsrael ? 0.02 : isUSA ? 0.025 : 0.06;
                const multiplier = isIsrael ? 1.17 : 1.0; // Israel: +17% VAT
                updateDeal({ userOverrides: { ...currentDeal?.userOverrides, customBrokerFee: e.target.checked ? p * rate * multiplier : 0 } });
              }}
              className="w-4 h-4 accent-amber-500 mt-0.5"
            />
            <div>
              <div className="text-sm font-medium text-amber-800">
                {isIsrael
                  ? 'I used a real estate agent (2% + 17% VAT)'
                  : isUSA
                  ? "I'm paying buyer's agent commission (~2.5%)"
                  : 'Buyer pays broker commission (6%)'}
              </div>
              <div className="text-xs text-amber-600 mt-0.5">
                {isIsrael
                  ? 'In Israel, buyer typically pays 2% + VAT to their agent. Check only if you used one.'
                  : isUSA
                  ? "Post-NAR settlement (2024): buyer's agent fee is now negotiated separately. Check if you agreed to pay it."
                  : 'In Brazil, the 6% corretagem is traditionally paid by the seller. Check only if explicitly agreed otherwise.'}
                {(currentDeal?.userOverrides.customBrokerFee ?? 0) > 0 && (
                  <span className="font-semibold ml-1">
                    ≈ {currencySymbol}{((currentDeal?.userOverrides.customBrokerFee ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} added to costs.
                  </span>
                )}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Renovation estimator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <RenovationEstimator />
      </div>

      {/* Navigation */}
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
          Continue to Financing
        </button>
      </div>
    </div>
  );
}
