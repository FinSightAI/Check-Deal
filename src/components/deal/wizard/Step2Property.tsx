'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { PropertyType, PurchaseStrategy, ConditionType } from '@/lib/types/deal';
import { BR_STATES } from '@/lib/constants/countries';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step2Property({ onNext, onBack }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  const property = currentDeal?.property;

  if (!property) return null;

  const update = (updates: Partial<typeof property>) => {
    updateDeal({ property: { ...property, ...updates } });
  };

  const price = property.agreedPrice || property.askingPrice;
  const pricePerSqm = property.sizeSqm > 0 ? price / property.sizeSqm : 0;

  const canProceed =
    property.askingPrice > 0 &&
    property.sizeSqm > 0 &&
    property.city.length > 0;

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
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">State</label>
            <select
              value={property.state}
              onChange={(e) => update({ state: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(BR_STATES).map(([code, s]) => (
                <option key={code} value={code}>{code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">City *</label>
            <input
              type="text"
              placeholder="e.g. São Paulo"
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
            placeholder="e.g. Itaim Bibi, Leblon, Savassi..."
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            Asking Price (R$) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
            <input
              type="number"
              placeholder="750000"
              value={property.askingPrice || ''}
              onChange={(e) => update({ askingPrice: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1.5">
            Agreed/Negotiated Price (R$) <span className="text-slate-400 font-normal">— leave blank if same as asking</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
            <input
              type="number"
              placeholder="Same as asking price"
              value={property.agreedPrice || ''}
              onChange={(e) => update({ agreedPrice: parseFloat(e.target.value) || undefined })}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {pricePerSqm > 0 && (
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <span className="text-sm text-slate-600">Price per sqm: </span>
            <span className="font-semibold text-slate-800">
              R${pricePerSqm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²
            </span>
          </div>
        )}
      </div>

      {/* Brazilian specifics */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Brazilian Property Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">
              IPTU (annual, R$)
            </label>
            <input
              type="number"
              placeholder="Auto-estimated"
              value={property.iptuAnnual || ''}
              onChange={(e) => update({ iptuAnnual: parseFloat(e.target.value) || undefined })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1.5">
              Condomínio (monthly, R$)
            </label>
            <input
              type="number"
              placeholder="Auto-estimated"
              value={property.condominiumMonthly || ''}
              onChange={(e) => update({ condominiumMonthly: parseFloat(e.target.value) || undefined })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={property.hasHabitese}
              onChange={(e) => update({ hasHabitese: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-700">Has Habite-se</div>
              <div className="text-xs text-slate-500">Occupancy permit</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={property.isNewDevelopment}
              onChange={(e) => update({ isNewDevelopment: e.target.checked })}
              className="w-4 h-4 accent-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-700">New Development</div>
              <div className="text-xs text-slate-500">Off-plan or launch</div>
            </div>
          </label>
        </div>
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
