'use client';

import { useMemo } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

interface Comparable {
  id: string;
  source: 'sold' | 'listing';
  address: string;
  sizeSqm: number;
  rooms: number;
  price: number;
  pricePerSqm: number;
  monthlyRent?: number;
  grossYield?: number;
  soldDate?: string;
  daysOnMarket?: number;
  condition: string;
  similarityScore: number;
  distanceKm: number;
  floor?: number;
}

interface RentalComparable {
  id: string;
  type: 'ltr' | 'str';
  address: string;
  sizeSqm: number;
  rooms: number;
  monthlyRent?: number;       // LTR
  rentPerSqm?: number;        // LTR
  nightlyRate?: number;       // STR
  occupancyPct?: number;      // STR
  strMonthlyEquiv?: number;   // STR derived monthly revenue
  daysOnMarket?: number;
  furnished: boolean;
  similarityScore: number;
  distanceKm: number;
  source: string;             // e.g. "ZAP Imóveis", "Airbnb", "QuintoAndar"
}

// Seeded pseudo-random (deterministic per deal)
function rand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return min + r * (max - min);
}

// City Airbnb market benchmarks (nightly rates in BRL for a 2BR equivalent)
const STR_BENCHMARKS: Record<string, { nightly: number; occupancy: number }> = {
  'são paulo':      { nightly: 280, occupancy: 68 },
  'rio de janeiro': { nightly: 320, occupancy: 72 },
  'florianópolis':  { nightly: 350, occupancy: 62 },
  'salvador':       { nightly: 220, occupancy: 58 },
  'fortaleza':      { nightly: 190, occupancy: 55 },
  'curitiba':       { nightly: 200, occupancy: 60 },
  'belo horizonte': { nightly: 210, occupancy: 58 },
  'porto alegre':   { nightly: 195, occupancy: 56 },
  'recife':         { nightly: 200, occupancy: 57 },
  'brasília':       { nightly: 230, occupancy: 61 },
};

function getStrBenchmark(city: string) {
  const key = Object.keys(STR_BENCHMARKS).find((k) => city.toLowerCase().includes(k));
  return key ? STR_BENCHMARKS[key] : { nightly: 200, occupancy: 58 };
}

// LTR market rent per sqm by state (BRL/month)
const LTR_RENT_PER_SQM: Record<string, number> = {
  SP: 42, RJ: 38, DF: 36, SC: 34, PR: 28,
  RS: 26, MG: 25, GO: 23, BA: 22, CE: 20,
  PE: 22, DEFAULT: 20,
};

const LTR_SOURCES = ['QuintoAndar', 'ZAP Imóveis', 'OLX', 'VivaReal', 'Airbnb (long-stay)'];
const STR_SOURCES = ['Airbnb', 'Booking.com', 'Airbnb', 'VRBO'];

const BASE_STREETS: Record<string, string[]> = {
  SP: ['Rua Oscar Freire', 'Av. Paulista', 'Rua Haddock Lobo', 'Al. Santos', 'Rua Augusta'],
  RJ: ['Rua Visconde de Pirajá', 'Av. Atlântica', 'Rua Dias Ferreira', 'Av. Epitácio Pessoa'],
  SC: ['Rua João Pinto', 'Av. Beira Mar Norte', 'Rua Felipe Schmidt'],
  DEFAULT: ['Rua Principal', 'Av. Central', 'Rua das Flores', 'Av. Brasil'],
};

function generateRentalComparables(deal: Deal): RentalComparable[] {
  const { city, state, rooms, sizeSqm, neighborhood } = deal.property;
  const streets = BASE_STREETS[state] || BASE_STREETS['DEFAULT'];
  const baseRentPerSqm = LTR_RENT_PER_SQM[state] || LTR_RENT_PER_SQM['DEFAULT'];
  const strBench = getStrBenchmark(city);

  // Generate 5 LTR comparables
  const ltr: RentalComparable[] = Array.from({ length: 5 }, (_, i) => {
    const sizeMult = rand(i * 7 + 31, 0.8, 1.2);
    const rentMult = rand(i * 3 + 41, 0.85, 1.18);
    const compSize = Math.round(sizeSqm * sizeMult);
    const compRentPerSqm = baseRentPerSqm * rentMult;
    const compRent = Math.round(compSize * compRentPerSqm / 50) * 50;
    const compRooms = Math.max(1, rooms + Math.round(rand(i + 0.4, -1, 1)));

    return {
      id: `ltr-${i}`,
      type: 'ltr' as const,
      address: `${streets[i % streets.length]}, ${Math.round(rand(i + 10, 100, 999))} - ${neighborhood || city}`,
      sizeSqm: compSize,
      rooms: compRooms,
      monthlyRent: compRent,
      rentPerSqm: parseFloat(compRentPerSqm.toFixed(1)),
      furnished: rand(i + 22, 0, 1) > 0.5,
      similarityScore: Math.round(rand(i * 2 + 13, 70, 96)),
      distanceKm: parseFloat(rand(i + 0.5, 0.2, 2.8).toFixed(1)),
      daysOnMarket: Math.round(rand(i * 4 + 2, 5, 60)),
      source: LTR_SOURCES[i % LTR_SOURCES.length],
    };
  });

  // Generate 4 STR comparables
  const str: RentalComparable[] = Array.from({ length: 4 }, (_, i) => {
    const sizeMult = rand(i * 9 + 51, 0.85, 1.15);
    const nightlyMult = rand(i * 5 + 61, 0.8, 1.25);
    const occMult = rand(i * 3 + 71, 0.85, 1.15);
    const compSize = Math.round(sizeSqm * sizeMult);
    const compRooms = Math.max(1, rooms + Math.round(rand(i + 1.4, -1, 1)));
    const nightly = Math.round(strBench.nightly * nightlyMult * (rooms / 2) / 10) * 10;
    const occupancy = Math.min(90, Math.max(30, strBench.occupancy * occMult));
    const monthly = Math.round(nightly * 30 * (occupancy / 100) / 100) * 100;

    return {
      id: `str-${i}`,
      type: 'str' as const,
      address: `${streets[(i + 1) % streets.length]}, ${Math.round(rand(i + 15, 100, 999))} - ${neighborhood || city}`,
      sizeSqm: compSize,
      rooms: compRooms,
      nightlyRate: nightly,
      occupancyPct: parseFloat(occupancy.toFixed(0)),
      strMonthlyEquiv: monthly,
      furnished: true,
      similarityScore: Math.round(rand(i * 2 + 23, 65, 90)),
      distanceKm: parseFloat(rand(i + 1.5, 0.3, 3.2).toFixed(1)),
      source: STR_SOURCES[i % STR_SOURCES.length],
    };
  });

  return [...ltr, ...str];
}

// Generate realistic mock comparables based on property location and specs
function generateComparables(deal: Deal): Comparable[] {
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const pricePerSqm = price / deal.property.sizeSqm;
  const { state, rooms, sizeSqm, neighborhood, city } = deal.property;

  const streets = BASE_STREETS[state] || BASE_STREETS['DEFAULT'];

  const sold: Comparable[] = Array.from({ length: 4 }, (_, i) => {
    const sizeMult = rand(i * 7 + 1, 0.75, 1.25);
    const priceMult = rand(i * 3 + 2, 0.82, 1.18);
    const compSize = Math.round(sizeSqm * sizeMult);
    const compPPSqm = pricePerSqm * priceMult;
    const compPrice = Math.round(compSize * compPPSqm / 1000) * 1000;
    const compRooms = Math.max(1, rooms + Math.round(rand(i + 0.5, -1, 1)));
    const rentMult = rand(i * 2 + 9, 0.9, 1.1);
    const monthlyRent = deal.rentalAssumptions.ltr.monthlyRent > 0
      ? Math.round(deal.rentalAssumptions.ltr.monthlyRent * rentMult / 100) * 100
      : undefined;
    const daysAgo = Math.round(rand(i * 4 + 1, 30, 365));
    const soldDate = new Date();
    soldDate.setDate(soldDate.getDate() - daysAgo);

    return {
      id: `sold-${i}`,
      source: 'sold' as const,
      address: `${streets[i % streets.length]}, ${Math.round(rand(i, 100, 999))} - ${neighborhood || city}`,
      sizeSqm: compSize,
      rooms: compRooms,
      price: compPrice,
      pricePerSqm: Math.round(compPPSqm),
      monthlyRent,
      grossYield: monthlyRent ? (monthlyRent * 12 / compPrice) * 100 : undefined,
      soldDate: soldDate.toISOString().split('T')[0],
      daysOnMarket: Math.round(rand(i * 5, 15, 120)),
      condition: ['excellent', 'good', 'good', 'needs-work'][i] || 'good',
      similarityScore: Math.round(rand(i * 2 + 3, 72, 96)),
      distanceKm: parseFloat((rand(i + 0.3, 0.2, 2.5)).toFixed(1)),
    };
  });

  const listings: Comparable[] = Array.from({ length: 3 }, (_, i) => {
    const sizeMult = rand(i * 11 + 6, 0.8, 1.2);
    const priceMult = rand(i * 5 + 3, 0.88, 1.22);
    const compSize = Math.round(sizeSqm * sizeMult);
    const compPPSqm = pricePerSqm * priceMult;
    const compPrice = Math.round(compSize * compPPSqm / 1000) * 1000;
    const compRooms = Math.max(1, rooms + Math.round(rand(i * 3 + 0.5, -1, 1)));

    return {
      id: `listing-${i}`,
      source: 'listing' as const,
      address: `${streets[(i + 2) % streets.length]}, ${Math.round(rand(i + 0.7, 200, 999))} - ${neighborhood || city}`,
      sizeSqm: compSize,
      rooms: compRooms,
      price: compPrice,
      pricePerSqm: Math.round(compPPSqm),
      daysOnMarket: Math.round(rand(i * 6 + 2, 5, 90)),
      condition: ['new', 'excellent', 'good'][i] || 'good',
      similarityScore: Math.round(rand(i * 4 + 7, 65, 90)),
      distanceKm: parseFloat((rand(i + 1.2, 0.3, 3.0)).toFixed(1)),
    };
  });

  return [...sold, ...listings].sort((a, b) => b.similarityScore - a.similarityScore);
}

interface Props {
  deal: Deal;
}

export function ComparableProperties({ deal }: Props) {
  const comparables = useMemo(() => generateComparables(deal), [deal]);
  const rentalComps = useMemo(() => generateRentalComparables(deal), [deal]);
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const pricePerSqm = price / deal.property.sizeSqm;

  const soldComps = comparables.filter((c) => c.source === 'sold');
  const listingComps = comparables.filter((c) => c.source === 'listing');
  const ltrComps = rentalComps.filter((c) => c.type === 'ltr');
  const strComps = rentalComps.filter((c) => c.type === 'str');

  const avgSoldPPSqm = soldComps.reduce((s, c) => s + c.pricePerSqm, 0) / soldComps.length;
  const avgListingPPSqm = listingComps.reduce((s, c) => s + c.pricePerSqm, 0) / listingComps.length;
  const vsAvgSold = ((pricePerSqm - avgSoldPPSqm) / avgSoldPPSqm) * 100;
  const vsAvgListing = ((pricePerSqm - avgListingPPSqm) / avgListingPPSqm) * 100;

  const avgYields = soldComps.filter((c) => c.grossYield).map((c) => c.grossYield!);
  const avgYield = avgYields.length ? avgYields.reduce((s, v) => s + v, 0) / avgYields.length : null;

  // LTR rental stats
  const ltrRents = ltrComps.map((c) => c.monthlyRent!).filter(Boolean);
  const ltrMin = Math.min(...ltrRents);
  const ltrMax = Math.max(...ltrRents);
  const ltrMedian = ltrRents.sort((a, b) => a - b)[Math.floor(ltrRents.length / 2)];
  const userRent = deal.rentalAssumptions.ltr.monthlyRent;
  const vsMarketRent = userRent > 0 ? ((userRent - ltrMedian) / ltrMedian) * 100 : null;

  // STR stats
  const strNightlies = strComps.map((c) => c.nightlyRate!).filter(Boolean);
  const strMedianNightly = [...strNightlies].sort((a, b) => a - b)[Math.floor(strNightlies.length / 2)];
  const strMonthlyRevenues = strComps.map((c) => c.strMonthlyEquiv!).filter(Boolean);
  const strMedianMonthly = [...strMonthlyRevenues].sort((a, b) => a - b)[Math.floor(strMonthlyRevenues.length / 2)];
  const avgOccupancy = strComps.reduce((s, c) => s + (c.occupancyPct ?? 0), 0) / strComps.length;

  return (
    <div className="space-y-6">
      {/* Market position — sales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 ${Math.abs(vsAvgSold) > 15 ? (vsAvgSold > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200') : 'bg-white border-slate-200'}`}>
          <div className="text-xs text-slate-500">Your price vs recent sales</div>
          <div className={`text-2xl font-bold mt-1 ${vsAvgSold > 5 ? 'text-orange-600' : vsAvgSold < -5 ? 'text-emerald-600' : 'text-slate-700'}`}>
            {vsAvgSold > 0 ? '+' : ''}{vsAvgSold.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Market avg: {formatCurrency(avgSoldPPSqm, 'BRL')}/m²
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">vs active listings</div>
          <div className={`text-2xl font-bold mt-1 ${vsAvgListing > 5 ? 'text-orange-600' : vsAvgListing < -5 ? 'text-emerald-600' : 'text-slate-700'}`}>
            {vsAvgListing > 0 ? '+' : ''}{vsAvgListing.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Listings avg: {formatCurrency(avgListingPPSqm, 'BRL')}/m²
          </div>
        </div>
        {avgYield && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Area avg gross yield</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{avgYield.toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Your deal: {formatPercent(deal.analysis?.returns.grossYield ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* ── RENTAL MARKET SECTION ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Rental Market Comparables</h3>
        <p className="text-xs text-slate-400 mb-4">
          What similar properties in {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}{deal.property.city} are currently renting for
        </p>

        {/* LTR Validation callout */}
        {userRent > 0 && vsMarketRent !== null && (
          <div className={`rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 ${
            Math.abs(vsMarketRent) <= 10
              ? 'bg-emerald-50 border-emerald-200'
              : vsMarketRent > 10
              ? 'bg-orange-50 border-orange-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <span className="text-xl flex-shrink-0">
              {Math.abs(vsMarketRent) <= 10 ? '✅' : vsMarketRent > 10 ? '⚠️' : '💡'}
            </span>
            <div>
              <div className={`text-sm font-semibold ${
                Math.abs(vsMarketRent) <= 10 ? 'text-emerald-800'
                  : vsMarketRent > 10 ? 'text-orange-800' : 'text-blue-800'
              }`}>
                Your rent assumption ({formatCurrency(userRent, 'BRL')}/mo) is{' '}
                {vsMarketRent > 0 ? '+' : ''}{vsMarketRent.toFixed(1)}% vs market median ({formatCurrency(ltrMedian, 'BRL')}/mo)
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Market range for similar {deal.property.rooms}BR properties in this area: {formatCurrency(ltrMin, 'BRL')} – {formatCurrency(ltrMax, 'BRL')}/month
              </div>
              {vsMarketRent > 15 && (
                <div className="text-xs text-orange-700 mt-1">
                  Your assumption is above market. Consider using {formatCurrency(ltrMedian, 'BRL')} as a conservative base case.
                </div>
              )}
              {vsMarketRent < -10 && (
                <div className="text-xs text-blue-700 mt-1">
                  Your assumption is below market — there may be upside potential if the property can command market rate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LTR market range bar */}
        {userRent > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">LTR Market Rent Range</span>
              <span className="text-xs text-slate-400">{deal.property.rooms}BR · {deal.property.sizeSqm}m² · {deal.property.city}</span>
            </div>
            <div className="relative h-8 flex items-center">
              {/* Range bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full relative">
                {/* Min-max range */}
                <div
                  className="absolute h-2 bg-blue-200 rounded-full"
                  style={{
                    left: '0%',
                    width: '100%',
                  }}
                />
                {/* Median marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
                  style={{
                    left: `${((ltrMedian - ltrMin) / (ltrMax - ltrMin)) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
                {/* User marker */}
                {userRent >= ltrMin && userRent <= ltrMax && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow"
                    style={{
                      left: `${Math.min(100, Math.max(0, ((userRent - ltrMin) / (ltrMax - ltrMin)) * 100))}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{formatCurrency(ltrMin, 'BRL')} min</span>
              <span className="text-blue-600 font-medium">Median: {formatCurrency(ltrMedian, 'BRL')}</span>
              <span>{formatCurrency(ltrMax, 'BRL')} max</span>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Market median</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Your assumption</span>
            </div>
          </div>
        )}

        {/* LTR comp cards */}
        <div className="space-y-2 mb-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Long-Term Rentals ({ltrComps.length} similar listings)</h4>
          {ltrComps.map((comp) => (
            <LTRCard key={comp.id} comp={comp} userRent={userRent} />
          ))}
        </div>

        {/* STR section */}
        {(deal.rentalAssumptions.strategy === 'short-term' || deal.rentalAssumptions.strategy === 'hybrid') && (
          <div className="space-y-3">
            {/* STR summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">Median nightly</div>
                <div className="text-lg font-bold text-slate-800 mt-0.5">{formatCurrency(strMedianNightly, 'BRL')}</div>
                <div className="text-xs text-slate-400">per night</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">Avg occupancy</div>
                <div className="text-lg font-bold text-slate-800 mt-0.5">{avgOccupancy.toFixed(0)}%</div>
                <div className="text-xs text-slate-400">area average</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">Monthly revenue</div>
                <div className="text-lg font-bold text-blue-600 mt-0.5">{formatCurrency(strMedianMonthly, 'BRL')}</div>
                <div className="text-xs text-slate-400">median equivalent</div>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Short-Term Rentals / Airbnb ({strComps.length} comparable listings)</h4>
            {strComps.map((comp) => (
              <STRCard key={comp.id} comp={comp} />
            ))}
          </div>
        )}

        {/* Show STR hint if LTR-only strategy */}
        {deal.rentalAssumptions.strategy === 'long-term' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
            STR/Airbnb market data available — switch strategy to "Short-term" or "Hybrid" in the Rental tab to compare.
            Area Airbnb median: ~{formatCurrency(strMedianMonthly, 'BRL')}/month equivalent.
          </div>
        )}
      </div>

      {/* Note about data */}
      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
        📍 Comparable data is estimated based on market averages for {deal.property.city}, {deal.property.state}.
        For precise comparables, check Zap Imóveis, OLX Imóveis, VivaReal, QuintoAndar (LTR), or Airbnb/Booking.com (STR), or request a professional CMA from a local broker.
      </div>

      {/* Sold comparables */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">
          Recent Sales ({soldComps.length} comparable transactions)
        </h3>
        <div className="space-y-2">
          {soldComps.map((comp) => (
            <CompCard key={comp.id} comp={comp} subjectPPSqm={pricePerSqm} />
          ))}
        </div>
      </div>

      {/* Active listings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">
          Active Listings ({listingComps.length} comparable properties)
        </h3>
        <div className="space-y-2">
          {listingComps.map((comp) => (
            <CompCard key={comp.id} comp={comp} subjectPPSqm={pricePerSqm} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LTRCard({ comp, userRent }: { comp: RentalComparable; userRent: number }) {
  const delta = userRent > 0 ? ((userRent - comp.monthlyRent!) / comp.monthlyRent!) * 100 : null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
      <div className="text-center w-12 flex-shrink-0">
        <div className="text-xs text-slate-400">Match</div>
        <div className={`text-sm font-bold ${comp.similarityScore >= 85 ? 'text-emerald-600' : comp.similarityScore >= 70 ? 'text-blue-600' : 'text-slate-500'}`}>
          {comp.similarityScore}%
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{comp.address}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {comp.rooms}BR · {comp.sizeSqm}m² · {comp.furnished ? 'Furnished' : 'Unfurnished'} · {comp.distanceKm}km away
          {comp.daysOnMarket ? ` · ${comp.daysOnMarket}d on market` : ''}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold text-slate-800">{formatCurrency(comp.monthlyRent!, 'BRL')}/mo</div>
        <div className="text-xs text-slate-400">{formatCurrency(comp.rentPerSqm!, 'BRL')}/m²</div>
        {delta !== null && (
          <div className={`text-xs font-medium ${Math.abs(delta) <= 5 ? 'text-slate-400' : delta > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
            {delta > 0 ? 'Your rent +' : 'Your rent '}{delta.toFixed(0)}%
          </div>
        )}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex-shrink-0">
        {comp.source}
      </span>
    </div>
  );
}

function STRCard({ comp }: { comp: RentalComparable }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
      <div className="text-center w-12 flex-shrink-0">
        <div className="text-xs text-slate-400">Match</div>
        <div className={`text-sm font-bold ${comp.similarityScore >= 85 ? 'text-emerald-600' : comp.similarityScore >= 70 ? 'text-blue-600' : 'text-slate-500'}`}>
          {comp.similarityScore}%
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{comp.address}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {comp.rooms}BR · {comp.sizeSqm}m² · Furnished · {comp.distanceKm}km away
        </div>
      </div>
      <div className="text-right flex-shrink-0 space-y-0.5">
        <div className="text-sm font-semibold text-slate-800">{formatCurrency(comp.nightlyRate!, 'BRL')}/night</div>
        <div className="text-xs text-slate-500">{comp.occupancyPct}% occupancy</div>
        <div className="text-xs font-medium text-blue-600">~{formatCurrency(comp.strMonthlyEquiv!, 'BRL')}/mo</div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">
        {comp.source}
      </span>
    </div>
  );
}

function CompCard({ comp, subjectPPSqm }: { comp: Comparable; subjectPPSqm: number }) {
  const priceDelta = ((comp.pricePerSqm - subjectPPSqm) / subjectPPSqm) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
      {/* Similarity */}
      <div className="text-center w-12 flex-shrink-0">
        <div className="text-xs text-slate-400">Match</div>
        <div className={`text-sm font-bold ${comp.similarityScore >= 85 ? 'text-emerald-600' : comp.similarityScore >= 70 ? 'text-blue-600' : 'text-slate-500'}`}>
          {comp.similarityScore}%
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{comp.address}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {comp.rooms}BR · {comp.sizeSqm}m² · {comp.condition} · {comp.distanceKm}km away
          {comp.source === 'sold' && comp.soldDate && ` · Sold ${comp.soldDate}`}
          {comp.source === 'listing' && comp.daysOnMarket && ` · ${comp.daysOnMarket}d on market`}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold text-slate-800">{formatCurrency(comp.price, 'BRL', true)}</div>
        <div className="flex items-center gap-1 justify-end">
          <span className="text-xs text-slate-500">{formatCurrency(comp.pricePerSqm, 'BRL')}/m²</span>
          <span className={`text-xs font-medium ${priceDelta > 3 ? 'text-red-500' : priceDelta < -3 ? 'text-emerald-600' : 'text-slate-400'}`}>
            ({priceDelta > 0 ? '+' : ''}{priceDelta.toFixed(0)}%)
          </span>
        </div>
        {comp.grossYield && (
          <div className="text-xs text-blue-600">{comp.grossYield.toFixed(1)}% yield</div>
        )}
      </div>

      {/* Source badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${comp.source === 'sold' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
        {comp.source === 'sold' ? 'Sold' : 'Listed'}
      </span>
    </div>
  );
}
