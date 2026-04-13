'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { RentalStrategy } from '@/lib/types/deal';
import { estimateAirbnbPotential } from '@/lib/calculations/airbnb';
import { formatCurrency } from '@/lib/utils/formatters';
import { RentalMarketInsight } from '@/components/rental/RentalMarketInsight';
import { useEffect, useState } from 'react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step4Rental({ onNext, onBack }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  const rental = currentDeal?.rentalAssumptions;
  const property = currentDeal?.property;
  const [airbnbEstimate, setAirbnbEstimate] = useState<{
    avgNightlyRate: number; occupancyRate: number; monthlyRevenue: number;
  } | null>(null);

  useEffect(() => {
    if (property) {
      const est = estimateAirbnbPotential(
        property.city,
        property.state,
        property.sizeSqm,
        property.rooms,
        property.condition,
        property.country
      );
      setAirbnbEstimate(est);

      // Pre-fill STR fields if empty
      if (!rental?.str.avgNightlyRate) {
        updateDeal({
          rentalAssumptions: {
            ...rental!,
            str: {
              ...rental!.str,
              avgNightlyRate: est.avgNightlyRate,
              occupancyRatePercent: est.occupancyRate,
            },
          },
        });
      }
    }
  }, []);

  if (!rental || !property) return null;

  const updateLTR = (updates: Partial<typeof rental.ltr>) => {
    updateDeal({ rentalAssumptions: { ...rental, ltr: { ...rental.ltr, ...updates } } });
  };

  const updateSTR = (updates: Partial<typeof rental.str>) => {
    updateDeal({ rentalAssumptions: { ...rental, str: { ...rental.str, ...updates } } });
  };

  const estimatedAnnualSTR = rental.str.avgNightlyRate > 0
    ? rental.str.avgNightlyRate * 365 * (rental.str.occupancyRatePercent / 100)
    : 0;
  const estimatedMonthlySTR = estimatedAnnualSTR / 12;

  const price = property.agreedPrice || property.askingPrice;
  const grossYieldLTR = rental.ltr.monthlyRent > 0
    ? ((rental.ltr.monthlyRent * 12) / price) * 100 : 0;
  const grossYieldSTR = estimatedAnnualSTR > 0
    ? (estimatedAnnualSTR / price) * 100 : 0;

  // Rental validation warnings
  const rentWarn: string | null =
    (rental.strategy === 'long-term' || rental.strategy === 'hybrid') && rental.ltr.monthlyRent === 0
      ? '⚠ Monthly rent is 0 — the yield calculation will show 0%. Enter an estimated rent.'
      : grossYieldLTR > 20
      ? '⚠ Gross yield above 20% is unusually high — double-check the rent vs price.'
      : grossYieldLTR > 0 && grossYieldLTR < 2
      ? '⚠ Gross yield below 2% is very low — verify rent amount.'
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Rental Strategy</h2>
        <p className="text-slate-500 mt-1">How do you plan to generate income from this property?</p>
      </div>

      {/* AI Market Estimate */}
      {property.city && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
          <RentalMarketInsight
            city={property.city}
            neighborhood={property.neighborhood || ''}
            state={property.state}
            sizeSqm={property.sizeSqm}
            rooms={property.rooms}
            propertyType={property.propertyType}
            country={property.country}
            currency={property.currency}
            userLtrRent={rental.ltr.monthlyRent || undefined}
            userNightlyRate={rental.str.avgNightlyRate || undefined}
            onApplyLtr={(rent) => updateLTR({ monthlyRent: rent })}
            onApplyStr={(nightly) => updateSTR({ avgNightlyRate: nightly })}
          />
        </div>
      )}

      {/* Strategy selector */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3">Primary Strategy</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'long-term', label: '🏠 Long-Term Rental', desc: 'Traditional tenants (12+ months)' },
            { value: 'short-term', label: '🏖️ Short-Term (Airbnb)', desc: 'Vacation/nightly rentals' },
            { value: 'hybrid', label: '🔄 Hybrid', desc: 'Mix both strategies' },
            { value: 'none', label: '🏡 No Rental', desc: 'Personal use or resale' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => updateDeal({ rentalAssumptions: { ...rental, strategy: s.value as RentalStrategy } })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                rental.strategy === s.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-medium text-slate-800">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Long-term rental */}
      {(rental.strategy === 'long-term' || rental.strategy === 'hybrid') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {rentWarn && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{rentWarn}</p>
          )}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Long-Term Rental Details</h3>
            {grossYieldLTR > 0 && (
              <span className="text-sm font-medium text-blue-600">
                {grossYieldLTR.toFixed(1)}% gross yield
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">
                Monthly Rent (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  placeholder="3500"
                  value={rental.ltr.monthlyRent || ''}
                  onChange={(e) => updateLTR({ monthlyRent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">
                Annual Rent Growth
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={rental.ltr.annualRentGrowthPercent}
                  onChange={(e) => updateLTR({ annualRentGrowthPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Vacancy Rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="30"
                  value={rental.ltr.vacancyRatePercent}
                  onChange={(e) => updateLTR({ vacancyRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Mgmt Fee</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={rental.ltr.managementFeePercent}
                  onChange={(e) => updateLTR({ managementFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Maintenance</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={rental.ltr.maintenancePercent}
                  onChange={(e) => updateLTR({ maintenancePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%/yr</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Short-term rental */}
      {(rental.strategy === 'short-term' || rental.strategy === 'hybrid') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Short-Term Rental (Airbnb)</h3>
            {grossYieldSTR > 0 && (
              <span className="text-sm font-medium text-emerald-600">
                {grossYieldSTR.toFixed(1)}% gross yield
              </span>
            )}
          </div>

          {/* AI estimate */}
          {airbnbEstimate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-xs font-medium text-emerald-700 mb-1">
                Market Estimate for {property.city}, {property.state}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-800">
                  ~R${airbnbEstimate.avgNightlyRate}/night
                </span>
                <span className="text-emerald-800">
                  ~{airbnbEstimate.occupancyRate}% occupancy
                </span>
                <span className="font-semibold text-emerald-900">
                  ~{formatCurrency(airbnbEstimate.monthlyRevenue, 'BRL')}/month
                </span>
              </div>
              <button
                onClick={() => updateSTR({
                  avgNightlyRate: airbnbEstimate.avgNightlyRate,
                  occupancyRatePercent: airbnbEstimate.occupancyRate,
                })}
                className="text-xs text-emerald-700 hover:text-emerald-900 underline mt-1"
              >
                Use these estimates
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">
                Avg Nightly Rate (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  value={rental.str.avgNightlyRate || ''}
                  onChange={(e) => updateSTR({ avgNightlyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">
                Target Occupancy Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={rental.str.occupancyRatePercent}
                  onChange={(e) => updateSTR({ occupancyRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Cleaning Fee (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  value={rental.str.cleaningFeePerStay}
                  onChange={(e) => updateSTR({ cleaningFeePerStay: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Platform Fee</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={rental.str.platformCommissionPercent}
                  onChange={(e) => updateSTR({ platformCommissionPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg px-3 pr-8 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Utilities/mo (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input
                  type="number"
                  value={rental.str.utilitiesMontly}
                  onChange={(e) => updateSTR({ utilitiesMontly: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {estimatedMonthlySTR > 0 && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Estimated gross monthly revenue</span>
              <span className="font-semibold text-slate-800">{formatCurrency(estimatedMonthlySTR, 'BRL')}</span>
            </div>
          )}

          {/* STR regulatory warning */}
          {['são paulo', 'rio de janeiro', 'florianópolis'].some(c =>
            property.city.toLowerCase().includes(c)
          ) && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              ⚠️ {property.city} is considering regulations on short-term rentals.
              Check your condominium rules (convenção) and local municipal ordinances before listing.
            </p>
          )}
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
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          Review & Analyze
        </button>
      </div>
    </div>
  );
}
