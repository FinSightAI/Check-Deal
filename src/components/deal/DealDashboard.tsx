'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg, getSeverityColor } from '@/lib/utils/formatters';
import { exportDealToPDF } from '@/lib/utils/pdfExport';
import { MetricsOverview } from '@/components/analysis/MetricsOverview';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { RentalComparison } from '@/components/rental/RentalComparison';
import { CostBreakdown } from '@/components/analysis/CostBreakdown';
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel';
import { AIChat } from '@/components/ai/AIChat';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { SensitivityAnalysis } from '@/components/analysis/SensitivityAnalysis';
import { ScenarioPlanning } from '@/components/analysis/ScenarioPlanning';
import { InternationalTaxPanel } from '@/components/analysis/InternationalTaxPanel';
import { ComparableProperties } from '@/components/market/ComparableProperties';
import { getShareUrl } from '@/lib/utils/shareUtils';
import {
  ArrowLeft, Plus, Building2, TrendingUp, Home, BarChart3,
  Bot, Shield, Globe, Sliders, GitBranch, MapPin, Download, MessageSquare, Share2,
} from 'lucide-react';

interface Props {
  deal: Deal;
  onNewDeal: () => void;
  onBack: () => void;
  readOnly?: boolean;
}

type Tab =
  | 'overview'
  | 'cash-flow'
  | 'rental'
  | 'costs'
  | 'market'
  | 'sensitivity'
  | 'scenarios'
  | 'intl-tax'
  | 'ai'
  | 'chat'
  | 'risks';

export function DealDashboard({ deal, onNewDeal, onBack, readOnly }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = getShareUrl(deal);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const { analysis } = deal;

  if (!analysis) return null;

  const { dealScore, riskFactors, marketContext } = analysis;
  const showIntlTax = deal.buyerProfile.taxResidency !== 'BR' && deal.buyerProfile.taxResidency !== 'OTHER';

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'cash-flow', label: 'Cash Flow', icon: BarChart3 },
    { id: 'sensitivity', label: 'Sensitivity', icon: Sliders },
    { id: 'scenarios', label: 'Scenarios', icon: GitBranch },
    { id: 'rental', label: 'Rental', icon: Home },
    { id: 'market', label: 'Comparables', icon: MapPin },
    { id: 'costs', label: 'Costs & Tax', icon: Building2 },
    ...(showIntlTax ? [{ id: 'intl-tax' as Tab, label: `${deal.buyerProfile.taxResidency} Tax`, icon: Globe }] : []),
    { id: 'ai', label: 'AI Insights', icon: Bot },
    { id: 'chat', label: 'Ask AI', icon: MessageSquare },
    { id: 'risks', label: 'Risks', icon: Shield, badge: String(riskFactors.filter(r => r.severity === 'high').length) },
  ];

  const price = deal.property.agreedPrice || deal.property.askingPrice;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800 truncate">{deal.name}</span>
            <span className="text-slate-400 hidden sm:block">·</span>
            <span className="text-sm text-slate-500 hidden sm:block truncate">
              {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}{deal.property.city}
            </span>
          </div>

          <div className={`px-3 py-1 rounded-full border text-xs font-semibold hidden sm:block ${getRatingBg(dealScore.rating)}`}>
            <span className={getRatingColor(dealScore.rating)}>
              {dealScore.total}/100 · {dealScore.rating.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:block">{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={() => exportDealToPDF(deal)}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">PDF</span>
          </button>

          {!readOnly && (
            <button
              onClick={onNewDeal}
              className="flex items-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">New Deal</span>
            </button>
          )}
        </div>
      </header>

      {/* Property summary bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">{deal.property.rooms}BR {deal.property.propertyType}</span>
            {' · '}{deal.property.sizeSqm}m²
          </span>
          <span className="text-slate-500">
            {formatCurrency(price, 'BRL', true)}
            {' '}
            <span className="text-xs text-slate-400">({formatCurrency(analysis.returns.pricePerSqm, 'BRL')}/m²)</span>
          </span>
          <span className={`font-medium ${marketContext.priceVsMarketPercent > 5 ? 'text-orange-600' : marketContext.priceVsMarketPercent < -5 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {marketContext.priceVsMarketPercent > 0 ? '+' : ''}{marketContext.priceVsMarketPercent.toFixed(1)}% vs market
          </span>
          <span className="text-slate-500">
            Yield: <span className="font-semibold text-blue-600">{formatPercent(analysis.returns.grossYield)}</span>
          </span>
          <span className="text-slate-500">
            Cap: <span className="font-semibold">{formatPercent(analysis.returns.capRate)}</span>
          </span>
          {showIntlTax && (
            <span className="text-slate-400 text-xs">
              Tax residency: <span className="font-medium text-slate-600">{deal.buyerProfile.taxResidency}</span>
              {deal.buyerProfile.isRomanianPassportHolder && ' · 🇷🇴 EU passport'}
            </span>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge && tab.badge !== '0' && (
                  <span className="absolute top-2 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && <MetricsOverview deal={deal} analysis={analysis} />}
        {activeTab === 'cash-flow' && (
          <div className="space-y-6">
            <CashFlowChart cashFlows={analysis.cashFlows} currency="BRL" />
            <ProjectionChart cashFlows={analysis.cashFlows} projections={analysis.returns.projections} currency="BRL" />
          </div>
        )}
        {activeTab === 'sensitivity' && <SensitivityAnalysis deal={deal} />}
        {activeTab === 'scenarios' && <ScenarioPlanning deal={deal} />}
        {activeTab === 'rental' && <RentalComparison deal={deal} analysis={analysis} />}
        {activeTab === 'market' && <ComparableProperties deal={deal} />}
        {activeTab === 'costs' && <CostBreakdown deal={deal} analysis={analysis} />}
        {activeTab === 'intl-tax' && <InternationalTaxPanel deal={deal} analysis={analysis} />}
        {activeTab === 'ai' && <AIInsightsPanel deal={deal} analysis={analysis} />}
        {activeTab === 'chat' && <AIChat deal={deal} analysis={analysis} />}
        {activeTab === 'risks' && <RisksTab riskFactors={riskFactors} />}
      </div>
    </div>
  );
}

function RisksTab({ riskFactors }: { riskFactors: NonNullable<Deal['analysis']>['riskFactors'] }) {
  const high = riskFactors.filter((r) => r.severity === 'high');
  const medium = riskFactors.filter((r) => r.severity === 'medium');
  const low = riskFactors.filter((r) => r.severity === 'low');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'High Risk', count: high.length, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Medium', count: medium.length, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Low', count: low.length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-sm text-slate-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[...high, ...medium, ...low].map((risk, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${getSeverityColor(risk.severity)}`}>
                {risk.severity.toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{risk.title}</span>
                  <span className="text-xs text-slate-400 capitalize">({risk.category})</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
                {risk.mitigation && (
                  <p className="text-sm text-blue-700 mt-2 bg-blue-50 rounded p-2">💡 {risk.mitigation}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
