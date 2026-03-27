'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RentalEstimate {
  ltr: {
    min: number; median: number; max: number;
    rentPerSqm: number; demandLevel: string;
    avgDaysToRent: number; factors: string[];
  };
  str: {
    nightlyMin: number; nightlyMedian: number; nightlyMax: number;
    avgOccupancy: number; monthlyRevenue: number;
    strViability: string; strNotes: string;
  };
  seasonality: { month: string; ltrMultiplier: number; strMultiplier: number }[];
  neighborhoodProfile: string;
  confidence: string;
  dataNote: string;
}

interface Props {
  city: string;
  neighborhood: string;
  state: string;
  sizeSqm: number;
  rooms: number;
  propertyType: string;
  userLtrRent?: number;
  userNightlyRate?: number;
  onApplyLtr?: (rent: number) => void;
  onApplyStr?: (nightly: number) => void;
}

const VIABILITY_COLOR: Record<string, string> = {
  excellent: 'text-emerald-600', good: 'text-blue-600',
  moderate: 'text-yellow-600', poor: 'text-red-500',
};

const DEMAND_COLOR: Record<string, string> = {
  high: 'text-emerald-600', medium: 'text-blue-600', low: 'text-red-500',
};

export function RentalMarketInsight({ city, neighborhood, state, sizeSqm, rooms, propertyType, userLtrRent, userNightlyRate, onApplyLtr, onApplyStr }: Props) {
  const [estimate, setEstimate] = useState<RentalEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEstimate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/rental-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, neighborhood, state, sizeSqm, rooms, propertyType }),
      });
      const data = await res.json();
      if (data.estimate) setEstimate(data.estimate);
      else setError('Could not load estimate');
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const ltrDelta = estimate && userLtrRent
    ? ((userLtrRent - estimate.ltr.median) / estimate.ltr.median) * 100
    : null;

  const strDelta = estimate && userNightlyRate
    ? ((userNightlyRate - estimate.str.nightlyMedian) / estimate.str.nightlyMedian) * 100
    : null;

  const strChartData = estimate?.seasonality.map((s) => ({
    month: s.month,
    revenue: Math.round(estimate.str.monthlyRevenue * s.strMultiplier),
    multiplier: s.strMultiplier,
  }));

  if (!estimate && !loading) {
    return (
      <button
        onClick={fetchEstimate}
        disabled={!city}
        className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40"
      >
        <Sparkles className="w-4 h-4" />
        Get AI Rental Estimate for {neighborhood || city}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-slate-700">Analyzing rental market…</div>
          <div className="text-xs text-slate-400 mt-0.5">Gemini is checking {neighborhood || city} rental data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-red-500 px-1">{error} — <button onClick={fetchEstimate} className="underline">retry</button></div>;
  }

  if (!estimate) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-slate-700">AI Rental Market Analysis</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${estimate.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' : estimate.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
            {estimate.confidence} confidence
          </span>
        </div>
        <button onClick={fetchEstimate} className="text-xs text-blue-500 hover:underline">Refresh</button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">{estimate.neighborhoodProfile}</p>

      {/* LTR Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Long-Term Rental (LTR)</h4>
          <span className={`text-xs font-medium ${DEMAND_COLOR[estimate.ltr.demandLevel] ?? 'text-slate-500'}`}>
            {estimate.ltr.demandLevel} demand · ~{estimate.ltr.avgDaysToRent}d to rent
          </span>
        </div>

        {/* Range bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{formatCurrency(estimate.ltr.min, 'BRL')}</span>
            <span className="text-blue-600 font-semibold">Median: {formatCurrency(estimate.ltr.median, 'BRL')}</span>
            <span>{formatCurrency(estimate.ltr.max, 'BRL')}</span>
          </div>
          <div className="relative h-2 bg-slate-100 rounded-full">
            <div className="absolute h-2 bg-blue-200 rounded-full" style={{ left: '0%', width: '100%' }} />
            <div className="absolute top-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
              style={{ left: '50%', transform: 'translate(-50%, -50%)' }} />
            {userLtrRent && userLtrRent >= estimate.ltr.min && userLtrRent <= estimate.ltr.max && (
              <div className="absolute top-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow"
                style={{
                  left: `${Math.min(100, Math.max(0, ((userLtrRent - estimate.ltr.min) / (estimate.ltr.max - estimate.ltr.min)) * 100))}%`,
                  transform: 'translate(-50%, -50%)',
                }} />
            )}
          </div>
          <div className="flex gap-3 mt-1.5 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Market median</span>
            {userLtrRent && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Your assumption</span>}
          </div>
        </div>

        {/* User comparison */}
        {ltrDelta !== null && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${Math.abs(ltrDelta) <= 10 ? 'bg-emerald-50 text-emerald-700' : ltrDelta > 10 ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
            {ltrDelta > 5 ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" /> : ltrDelta < -5 ? <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" /> : <Minus className="w-3.5 h-3.5 flex-shrink-0" />}
            Your rent ({formatCurrency(userLtrRent!, 'BRL')}) is {ltrDelta > 0 ? '+' : ''}{ltrDelta.toFixed(1)}% vs AI market estimate
            {ltrDelta > 15 && ' — consider revising down for conservative analysis'}
            {ltrDelta < -10 && ' — there may be upside potential'}
          </div>
        )}

        <div className="text-xs text-slate-400">{formatCurrency(estimate.ltr.rentPerSqm, 'BRL')}/m² · {estimate.ltr.factors.join(' · ')}</div>

        {onApplyLtr && (
          <button onClick={() => onApplyLtr(estimate.ltr.median)}
            className="text-xs text-blue-500 hover:underline">
            Use median ({formatCurrency(estimate.ltr.median, 'BRL')}) as my assumption →
          </button>
        )}
      </div>

      {/* STR Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Short-Term Rental (Airbnb)</h4>
          <span className={`text-xs font-medium ${VIABILITY_COLOR[estimate.str.strViability] ?? 'text-slate-500'}`}>
            {estimate.str.strViability} viability
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-slate-400">Nightly range</div>
            <div className="text-sm font-semibold text-slate-700">{formatCurrency(estimate.str.nightlyMin, 'BRL')}–{formatCurrency(estimate.str.nightlyMax, 'BRL')}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Avg occupancy</div>
            <div className="text-sm font-semibold text-slate-700">{estimate.str.avgOccupancy}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Monthly revenue</div>
            <div className="text-sm font-semibold text-blue-600">{formatCurrency(estimate.str.monthlyRevenue, 'BRL')}</div>
          </div>
        </div>

        {strDelta !== null && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${Math.abs(strDelta) <= 10 ? 'bg-emerald-50 text-emerald-700' : strDelta > 10 ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
            {strDelta > 5 ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" /> : strDelta < -5 ? <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" /> : <Minus className="w-3.5 h-3.5 flex-shrink-0" />}
            Your nightly rate ({formatCurrency(userNightlyRate!, 'BRL')}) is {strDelta > 0 ? '+' : ''}{strDelta.toFixed(1)}% vs AI estimate
          </div>
        )}

        <p className="text-xs text-slate-400">{estimate.str.strNotes}</p>

        {onApplyStr && (
          <button onClick={() => onApplyStr(estimate.str.nightlyMedian)}
            className="text-xs text-blue-500 hover:underline">
            Use median nightly ({formatCurrency(estimate.str.nightlyMedian, 'BRL')}) →
          </button>
        )}

        {/* Seasonality chart */}
        {strChartData && (
          <div>
            <div className="text-xs text-slate-500 font-medium mb-2">Monthly STR Revenue Forecast</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={strChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'BRL')} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {strChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.multiplier >= 1.1 ? '#10b981' : entry.multiplier <= 0.85 ? '#f87171' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Peak</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500 inline-block" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block" /> Low</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-300">{estimate.dataNote}</p>
    </div>
  );
}
