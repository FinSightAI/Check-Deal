'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency } from '@/lib/utils/formatters';
import { TrendingUp, TrendingDown, Minus, MapPin, AlertCircle, BarChart3, Home } from 'lucide-react';

interface Props { deal: Deal }

interface MarketData {
  pricePerSqm: {
    area: number;
    city: number;
    premium: number;
    budget: number;
  };
  comparables: Array<{
    description: string;
    price: number;
    pricePerSqm: number;
    daysOnMarket: number;
    source: string;
  }>;
  marketTrend: {
    direction: 'rising' | 'stable' | 'falling';
    annualAppreciation: number;
    supplyDemand: string;
    liquidityScore: number;
    avgDaysToSell: number;
    priceNegotiationRoom: number;
  };
  neighborhoodProfile: {
    description: string;
    keyAmenities: string[];
    infrastructure: string;
    safety: string;
    growthPotential: string;
    targetDemographic: string;
  };
  pricingAssessment: {
    verdict: 'below-market' | 'fair' | 'above-market' | 'significantly-above';
    percentVsMarket: number;
    recommendation: string;
  };
  marketOutlook: string;
  confidence: string;
  dataNote: string;
}

function ScoreDot({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-6 text-right">{value}</span>
    </div>
  );
}

export function MarketDataPanel({ deal }: Props) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { property, analysis } = deal;
  const price = property.agreedPrice || property.askingPrice;

  const fetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await window.fetch('/api/ai/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: property.city,
          neighborhood: property.neighborhood,
          state: property.state,
          sizeSqm: property.sizeSqm,
          rooms: property.rooms,
          propertyType: property.propertyType,
          askingPrice: price,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.marketData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6 text-center">
          <BarChart3 className="w-10 h-10 text-teal-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 mb-2">AI Market Data Analysis</h3>
          <p className="text-sm text-slate-600 mb-1">
            Comparable sales, price per m², neighborhood profile, and market outlook for{' '}
            <strong>{property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city}</strong>
          </p>
          <p className="text-xs text-slate-400 mb-5">Powered by Gemini AI · Uses current Brazilian real estate market knowledge</p>
          <button
            onClick={fetch}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Analyze Market
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Analyzing market data…</p>
          <p className="text-sm text-slate-400 mt-1">Checking comparables, trends, and neighborhood profile</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Failed to load market data</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button onClick={fetch} className="text-sm text-red-700 underline mt-2">Try again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const verdictConfig = {
    'below-market': { label: 'Below Market', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
    'fair': { label: 'Fair Price', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-300' },
    'above-market': { label: 'Above Market', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300' },
    'significantly-above': { label: 'Significantly Above Market', color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
  }[data.pricingAssessment.verdict] ?? { label: 'Unknown', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-300' };

  const trendIcon = data.marketTrend.direction === 'rising'
    ? <TrendingUp className="w-5 h-5 text-emerald-600" />
    : data.marketTrend.direction === 'falling'
    ? <TrendingDown className="w-5 h-5 text-red-500" />
    : <Minus className="w-5 h-5 text-slate-500" />;

  return (
    <div className="space-y-6">
      {/* Pricing verdict */}
      <div className={`border-2 rounded-xl p-5 ${verdictConfig.bg}`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Pricing Assessment</div>
            <div className={`text-2xl font-bold ${verdictConfig.color}`}>{verdictConfig.label}</div>
            <div className="text-sm text-slate-600 mt-1">{data.pricingAssessment.recommendation}</div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${data.pricingAssessment.percentVsMarket > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {data.pricingAssessment.percentVsMarket > 0 ? '+' : ''}{data.pricingAssessment.percentVsMarket.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">vs area average</div>
          </div>
        </div>
      </div>

      {/* Price per m² comparison */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-4">Price per m² Benchmark</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'This property', val: analysis ? analysis.returns.pricePerSqm : price / property.sizeSqm, highlight: true },
            { label: 'Area average', val: data.pricePerSqm.area },
            { label: 'City average', val: data.pricePerSqm.city },
            { label: 'Premium areas', val: data.pricePerSqm.premium },
          ].map(item => (
            <div key={item.label} className={`rounded-lg p-3 ${item.highlight ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
              <div className="text-xs text-slate-500 mb-1">{item.label}</div>
              <div className={`font-bold text-lg ${item.highlight ? 'text-blue-700' : 'text-slate-800'}`}>
                {formatCurrency(item.val, 'BRL')}/m²
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparables */}
      {data.comparables?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700 flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-400" />
            Comparable Properties
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <th className="px-4 py-2 text-left">Property</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">R$/m²</th>
                <th className="px-4 py-2 text-right">Days on Market</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.comparables.map((comp, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{comp.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(comp.price, 'BRL', true)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(comp.pricePerSqm, 'BRL')}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{comp.daysOnMarket}d</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            AI-estimated comparables based on current market knowledge · Not live listings
          </div>
        </div>
      )}

      {/* Market trend + neighborhood */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            {trendIcon} Market Trend
          </h4>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Annual appreciation', val: `${data.marketTrend.annualAppreciation.toFixed(1)}%` },
              { label: 'Supply/demand', val: data.marketTrend.supplyDemand.replace('-', ' ') },
              { label: 'Avg days to sell', val: `${data.marketTrend.avgDaysToSell} days` },
              { label: 'Negotiation room', val: `~${data.marketTrend.priceNegotiationRoom}%` },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-slate-700 capitalize">{item.val}</span>
              </div>
            ))}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Liquidity score</span>
                <span className="font-medium text-slate-700">{data.marketTrend.liquidityScore}/10</span>
              </div>
              <ScoreDot value={data.marketTrend.liquidityScore} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" /> Neighborhood
          </h4>
          <p className="text-sm text-slate-600 mb-3">{data.neighborhoodProfile.description}</p>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Infrastructure', val: data.neighborhoodProfile.infrastructure },
              { label: 'Safety', val: data.neighborhoodProfile.safety },
              { label: 'Growth potential', val: data.neighborhoodProfile.growthPotential },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-slate-500">{item.label}</span>
                <span className={`font-medium capitalize ${item.val === 'excellent' || item.val === 'high' ? 'text-emerald-600' : item.val === 'good' || item.val === 'medium' ? 'text-blue-600' : 'text-amber-600'}`}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
          {data.neighborhoodProfile.keyAmenities?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.neighborhoodProfile.keyAmenities.map((a, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market outlook */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-5">
        <h4 className="font-semibold text-slate-700 mb-2">Market Outlook</h4>
        <p className="text-sm text-slate-700">{data.marketOutlook}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          {data.dataNote} · Confidence: <strong>{data.confidence}</strong> · AI-generated estimates, not live transaction data.
          Always verify with a local corretor or via CRECI-SP/ZAP Imóveis/VivaReal listings.
        </span>
      </div>

      <button
        onClick={fetch}
        className="text-sm text-teal-600 hover:text-teal-800 underline"
      >
        Refresh analysis
      </button>
    </div>
  );
}
