'use client';

import { useState } from 'react';
import { Deal, PipelineStatus } from '@/lib/types/deal';
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
import { DueDiligenceChecklist } from '@/components/deal/DueDiligenceChecklist';
import { NegotiationPanel } from '@/components/deal/NegotiationPanel';
import { PFvsPJPanel } from '@/components/deal/PFvsPJPanel';
import { MonteCarloSimulation } from '@/components/analysis/MonteCarloSimulation';
import { GCAPCalculator } from '@/components/analysis/GCAPCalculator';
import { PropertyMap } from '@/components/deal/PropertyMap';
import { MarketDataPanel } from '@/components/market/MarketDataPanel';
import { ShareDealModal } from '@/components/deal/ShareDealModal';
import { getShareUrl } from '@/lib/utils/shareUtils';
import { AuthButton } from '@/components/auth/AuthButton';
import { useDealStore } from '@/lib/store/dealStore';
import {
  ArrowLeft, Plus, Building2, TrendingUp, Home, BarChart3,
  Bot, Shield, Globe, Sliders, GitBranch, MapPin, Download, MessageSquare, Share2, ClipboardList,
  Handshake, Scale, StickyNote, Dice5, Calculator, TrendingDown, Users, MoreVertical, X,
} from 'lucide-react';

const PIPELINE_STATUSES: { id: PipelineStatus; label: string; color: string; bg: string }[] = [
  { id: 'exploring', label: 'Exploring', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'negotiating', label: 'Negotiating', color: 'text-blue-700', bg: 'bg-blue-100' },
  { id: 'due-diligence', label: 'Due Diligence', color: 'text-amber-700', bg: 'bg-amber-100' },
  { id: 'offer-made', label: 'Offer Made', color: 'text-purple-700', bg: 'bg-purple-100' },
  { id: 'closed', label: 'Closed ✓', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  { id: 'passed', label: 'Passed ✗', color: 'text-red-600', bg: 'bg-red-100' },
];

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
  | 'market-data'
  | 'sensitivity'
  | 'scenarios'
  | 'intl-tax'
  | 'ai'
  | 'chat'
  | 'risks'
  | 'checklist'
  | 'negotiate'
  | 'pf-pj'
  | 'monte-carlo'
  | 'gcap';

export function DealDashboard({ deal, onNewDeal, onBack, readOnly }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { updateDeal, saveDeal } = useDealStore();

  const pipelineStatus = deal.pipelineStatus ?? 'exploring';
  const statusInfo = PIPELINE_STATUSES.find(s => s.id === pipelineStatus) ?? PIPELINE_STATUSES[0];

  const setStatus = (s: PipelineStatus) => {
    updateDeal({ pipelineStatus: s });
    saveDeal();
    setShowStatusMenu(false);
  };

  const saveNotes = (notes: string) => {
    updateDeal({ userOverrides: { ...deal.userOverrides, notes } });
    saveDeal();
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const longUrl = getShareUrl(deal);
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl }),
      });
      const { short } = await res.json();
      await navigator.clipboard.writeText(short);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const url = getShareUrl(deal);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setSharing(false);
    }
  };
  const handleWhatsApp = () => {
    if (!deal.analysis) return;
    const a = deal.analysis;
    const price = deal.property.agreedPrice || deal.property.askingPrice;
    const cf1Monthly = Math.round((a.cashFlows[0]?.cashFlow ?? 0) / 12);
    const yr10 = a.returns.projections.find(p => p.years === 10);
    const text = [
      `🏠 *CheckDeal Analysis*`,
      `📍 ${deal.name}`,
      `${deal.property.rooms}BR ${deal.property.propertyType} · ${deal.property.sizeSqm}m² · ${deal.property.neighborhood ? deal.property.neighborhood + ', ' : ''}${deal.property.city}`,
      ``,
      `💰 Price: R$ ${price.toLocaleString('pt-BR')}`,
      `📊 Gross Yield: ${a.returns.grossYield.toFixed(1)}% | Net: ${a.returns.netYield.toFixed(1)}%`,
      `📈 Cap Rate: ${a.returns.capRate.toFixed(1)}%`,
      `💵 Monthly CF (Y1): ${cf1Monthly >= 0 ? '+' : ''}R$ ${cf1Monthly.toLocaleString('pt-BR')}`,
      `🏆 Score: ${a.dealScore.total}/100 — ${a.dealScore.rating.toUpperCase()}`,
      yr10 ? `📅 10Y value: R$ ${Math.round(yr10.projectedValue / 1000)}K (+${yr10.totalReturn.toFixed(0)}%)` : '',
      ``,
      `_Analyzed with CheckDeal.vercel.app_`,
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
    { id: 'monte-carlo', label: 'Monte Carlo', icon: Dice5 },
    { id: 'rental', label: 'Rental', icon: Home },
    { id: 'market', label: 'Comparables', icon: MapPin },
    { id: 'market-data', label: 'Market Data', icon: TrendingDown },
    { id: 'costs', label: 'Costs & Tax', icon: Building2 },
    { id: 'gcap', label: 'GCAP', icon: Calculator },
    ...(showIntlTax ? [{ id: 'intl-tax' as Tab, label: `${deal.buyerProfile.taxResidency} Tax`, icon: Globe }] : []),
    { id: 'ai', label: 'AI Insights', icon: Bot },
    { id: 'chat', label: 'Ask AI', icon: MessageSquare },
    { id: 'risks', label: 'Risks', icon: Shield, badge: String(riskFactors.filter(r => r.severity === 'high').length) },
    { id: 'checklist', label: 'Due Diligence', icon: ClipboardList },
    { id: 'negotiate', label: 'Negotiate', icon: Handshake },
    { id: 'pf-pj', label: 'PF vs PJ', icon: Scale },
  ];

  const price = deal.property.agreedPrice || deal.property.askingPrice;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-slate-800 truncate block text-sm sm:text-base">{deal.name}</span>
              <span className="text-xs text-slate-400 truncate block sm:hidden">
                {deal.property.city} · {dealScore.total}/100
              </span>
            </div>
          </div>

          {/* Desktop: score + status + all buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${getRatingBg(dealScore.rating)}`}>
              <span className={getRatingColor(dealScore.rating)}>
                {dealScore.total}/100 · {dealScore.rating.toUpperCase()}
              </span>
            </div>

            {!readOnly && (
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                >
                  {statusInfo.label} ▾
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                    {PIPELINE_STATUSES.map(s => (
                      <button key={s.id} onClick={() => setStatus(s.id)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 ${s.color} ${pipelineStatus === s.id ? 'bg-slate-50' : ''}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!readOnly && (
              <button onClick={() => setShowNotes(v => !v)}
                className={`p-2 rounded-lg ${showNotes ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-100 text-slate-500'}`}>
                <StickyNote className="w-4 h-4" />
              </button>
            )}

            <button onClick={handleShare} disabled={sharing}
              className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg disabled:opacity-50">
              {sharing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Share2 className="w-4 h-4" />}
              {copied ? '✓ Copied!' : sharing ? 'Shortening…' : 'Share'}
            </button>

            {!readOnly && (
              <button onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 text-sm border border-indigo-300 text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg">
                <Users className="w-4 h-4" /> Collab
              </button>
            )}

            <button onClick={handleWhatsApp}
              className="flex items-center gap-1.5 text-sm border border-green-300 text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>

            <button onClick={() => exportDealToPDF(deal)}
              className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg">
              <Download className="w-4 h-4" /> PDF
            </button>

            <AuthButton variant="light" />

            {!readOnly && (
              <button onClick={onNewDeal}
                className="flex items-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg">
                <Plus className="w-4 h-4" /> New Deal
              </button>
            )}
          </div>

          {/* Mobile: only Share + New Deal + ⋮ */}
          <div className="flex sm:hidden items-center gap-1">
            <button onClick={handleShare} disabled={sharing}
              className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50">
              {sharing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Share2 className="w-4 h-4" />}
            </button>

            {!readOnly && (
              <button onClick={onNewDeal} className="p-2 rounded-lg bg-blue-500 text-white">
                <Plus className="w-4 h-4" />
              </button>
            )}

            <button onClick={() => setShowMobileMenu(v => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              {showMobileMenu ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 z-10 relative">
          {!readOnly && (
            <div className="pb-2 mb-2 border-b border-slate-100">
              <p className="text-xs text-slate-400 mb-1.5">Pipeline Status</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STATUSES.map(s => (
                  <button key={s.id} onClick={() => { setStatus(s.id); setShowMobileMenu(false); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color} ${pipelineStatus === s.id ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!readOnly && (
              <button onClick={() => { setShowNotes(v => !v); setShowMobileMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700">
                <StickyNote className="w-4 h-4 text-amber-500" /> Notes
              </button>
            )}
            {!readOnly && (
              <button onClick={() => { setShowShareModal(true); setShowMobileMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-indigo-200 text-sm text-indigo-700">
                <Users className="w-4 h-4" /> Collab
              </button>
            )}
            <button onClick={() => { handleWhatsApp(); setShowMobileMenu(false); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-200 text-sm text-green-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button onClick={() => { exportDealToPDF(deal); setShowMobileMenu(false); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      )}

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

      {/* Tabs — scrollable */}
      <div className="bg-white border-b border-slate-200 sticky top-[57px] z-10">
        <div className="max-w-7xl mx-auto relative">
          {/* Fade indicators */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 sm:hidden" />

          <div className="flex gap-0 overflow-x-auto scrollbar-hide px-2 sm:px-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  {tab.badge && tab.badge !== '0' && (
                    <span className="absolute top-2 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <MetricsOverview deal={deal} analysis={analysis} />
            <PropertyMap
              address={deal.property.address}
              city={deal.property.city}
              neighborhood={deal.property.neighborhood}
              state={deal.property.state}
            />
          </div>
        )}
        {activeTab === 'cash-flow' && (
          <div className="space-y-6">
            <CashFlowChart cashFlows={analysis.cashFlows} currency="BRL" />
            <ProjectionChart cashFlows={analysis.cashFlows} projections={analysis.returns.projections} currency="BRL" />
          </div>
        )}
        {activeTab === 'sensitivity' && <SensitivityAnalysis deal={deal} />}
        {activeTab === 'scenarios' && <ScenarioPlanning deal={deal} />}
        {activeTab === 'monte-carlo' && <MonteCarloSimulation deal={deal} />}
        {activeTab === 'rental' && <RentalComparison deal={deal} analysis={analysis} />}
        {activeTab === 'market' && <ComparableProperties deal={deal} />}
        {activeTab === 'market-data' && <MarketDataPanel deal={deal} />}
        {activeTab === 'costs' && <CostBreakdown deal={deal} analysis={analysis} />}
        {activeTab === 'gcap' && <GCAPCalculator deal={deal} />}
        {activeTab === 'intl-tax' && <InternationalTaxPanel deal={deal} analysis={analysis} />}
        {activeTab === 'ai' && <AIInsightsPanel deal={deal} analysis={analysis} />}
        {activeTab === 'chat' && <AIChat deal={deal} analysis={analysis} />}
        {activeTab === 'risks' && <RisksTab riskFactors={riskFactors} />}
        {activeTab === 'checklist' && <DueDiligenceChecklist deal={deal} />}
        {activeTab === 'negotiate' && <NegotiationPanel deal={deal} />}
        {activeTab === 'pf-pj' && <PFvsPJPanel deal={deal} />}
      </div>

      {/* Share / collab modal */}
      {showShareModal && (
        <ShareDealModal deal={deal} onClose={() => setShowShareModal(false)} />
      )}

      {/* Notes panel */}
      {showNotes && !readOnly && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-4 sm:right-4 sm:left-auto sm:w-80 bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl z-30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">Deal Notes</span>
            </div>
            <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>
          <textarea
            className="w-full px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none rounded-b-2xl"
            rows={8}
            placeholder="Notes about this deal — seller contact, inspection findings, negotiation status…"
            defaultValue={deal.userOverrides.notes ?? ''}
            onBlur={(e) => saveNotes(e.target.value)}
          />
        </div>
      )}
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
