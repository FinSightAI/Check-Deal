'use client';

import { useState } from 'react';
import { Deal, DealAnalysis, AIInsights } from '@/lib/types/deal';
import { getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { Bot, Loader2, RefreshCw, CheckCircle, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { useDealStore } from '@/lib/store/dealStore';

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

export function AIInsightsPanel({ deal, analysis }: Props) {
  const [insights, setInsights] = useState<AIInsights | null>(deal.aiInsights ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateDeal, saveDeal } = useDealStore();

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal, analysis }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI analysis failed');
      }

      const data = await res.json();
      setInsights(data.insights);
      // Cache in store so it survives tab switches and page reloads
      updateDeal({ aiInsights: data.insights });
      saveDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI insights');
    } finally {
      setLoading(false);
    }
  };

  if (!insights && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">AI Deal Analysis</h3>
        <p className="text-slate-500 max-w-md mb-6 text-sm">
          Get Claude AI to analyze this deal with Brazilian market expertise —
          specific advice on taxes, rental strategy, negotiation, and risks.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 max-w-md">
            {error}
          </div>
        )}
        <button
          onClick={fetchInsights}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Bot className="w-4 h-4" />
          Analyze with Claude AI
        </button>
        <p className="text-xs text-slate-400 mt-2">Requires ANTHROPIC_API_KEY in .env.local</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Claude AI is analyzing your deal...</p>
        <p className="text-slate-400 text-sm mt-1">Reviewing Brazilian tax laws, market conditions, and deal metrics</p>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Bot className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-slate-700">Claude AI Analysis</span>
          <span className="text-xs text-slate-400">
            {new Date(insights.generatedAt).toLocaleDateString()}
          </span>
          {analysis.runAt && new Date(insights.generatedAt) < new Date(analysis.runAt) && (
            <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
              ⚠ Generated before last re-analysis — consider refreshing
            </span>
          )}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {/* Recommendation */}
      <div className={`border rounded-xl p-5 ${getRatingBg(insights.recommendation === 'strong-buy' || insights.recommendation === 'buy' ? 'good' : insights.recommendation === 'hold' ? 'fair' : 'poor')}`}>
        <div className="flex items-start gap-3">
          <TrendingUp className={`w-5 h-5 mt-0.5 ${getRatingColor(insights.recommendation === 'strong-buy' ? 'excellent' : insights.recommendation === 'buy' ? 'good' : insights.recommendation === 'hold' ? 'fair' : 'poor')}`} />
          <div>
            <div className={`font-bold text-lg ${getRatingColor(insights.recommendation === 'strong-buy' ? 'excellent' : insights.recommendation === 'buy' ? 'good' : insights.recommendation === 'hold' ? 'fair' : 'poor')}`}>
              {insights.recommendation.replace('-', ' ').toUpperCase()}
            </div>
            <p className="text-slate-700 mt-1 leading-relaxed">{insights.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-slate-700">Key Strengths</h3>
          </div>
          <ul className="space-y-2">
            {insights.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-slate-700">Key Risks</h3>
          </div>
          <ul className="space-y-2">
            {insights.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Market Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-2">Market Context</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{insights.marketContext}</p>
      </div>

      {/* Tax Advice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-900 mb-2">Brazilian Tax Advice</h3>
        <p className="text-sm text-amber-800 leading-relaxed">{insights.taxAdvice}</p>
      </div>

      {/* Rental Advice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <h3 className="font-semibold text-emerald-900 mb-2">Rental Strategy Advice</h3>
        <p className="text-sm text-emerald-800 leading-relaxed">{insights.rentalAdvice}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Negotiation Tips */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-700">Negotiation Tips</h3>
          </div>
          <ul className="space-y-2">
            {insights.negotiationTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-blue-400 mt-0.5 flex-shrink-0 font-bold">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Action items */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-slate-700">Action Items</h3>
          </div>
          <ul className="space-y-2">
            {insights.specificAdvice.map((advice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-purple-400 mt-0.5 flex-shrink-0">→</span>
                {advice}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        AI analysis is for informational purposes only. Consult a licensed Brazilian real estate professional,
        accountant (contador), and lawyer (advogado) before making investment decisions.
      </p>
    </div>
  );
}
