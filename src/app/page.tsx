'use client';

import { useState } from 'react';
import { DealWizard } from '@/components/deal/DealWizard';
import { DealDashboard } from '@/components/deal/DealDashboard';
import { SavedDeals } from '@/components/deal/SavedDeals';
import { DealComparison } from '@/components/deal/DealComparison';
import { PortfolioView } from '@/components/portfolio/PortfolioView';
import { useDealStore } from '@/lib/store/dealStore';
import { Deal } from '@/lib/types/deal';
import { AuthButton } from '@/components/auth/AuthButton';
import { Building2, Plus, List, TrendingUp, PieChart } from 'lucide-react';

type View = 'home' | 'new-deal' | 'dashboard' | 'saved-deals' | 'compare' | 'portfolio';

export default function HomePage() {
  const [view, setView] = useState<View>('home');
  const [compareDeals, setCompareDeals] = useState<Deal[]>([]);
  const { currentDeal, deals, createDeal } = useDealStore();

  const handleNewDeal = () => {
    createDeal();
    setView('new-deal');
  };

  const handleAnalysisComplete = () => {
    setView('dashboard');
  };

  if (view === 'new-deal') {
    return (
      <DealWizard
        onComplete={handleAnalysisComplete}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'dashboard' && currentDeal?.analysis) {
    return (
      <DealDashboard
        deal={currentDeal}
        onNewDeal={handleNewDeal}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'portfolio') {
    return (
      <PortfolioView
        deals={deals}
        onBack={() => setView('home')}
        onSelectDeal={(deal) => {
          useDealStore.getState().setCurrentDeal(deal);
          setView('dashboard');
        }}
      />
    );
  }

  if (view === 'compare') {
    return (
      <DealComparison
        deals={compareDeals}
        onBack={() => setView('saved-deals')}
        onSelectDeal={(deal) => {
          useDealStore.getState().setCurrentDeal(deal);
          setView('dashboard');
        }}
      />
    );
  }

  if (view === 'saved-deals') {
    return (
      <SavedDeals
        onBack={() => setView('home')}
        onSelectDeal={(deal) => {
          useDealStore.getState().setCurrentDeal(deal);
          setView('dashboard');
        }}
        onNewDeal={handleNewDeal}
        onCompare={(selected) => {
          setCompareDeals(selected);
          setView('compare');
        }}
      />
    );
  }

  // Home screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">CheckDeal</span>
              <span className="text-blue-400 text-xs ml-2">Brazil Real Estate</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deals.length > 0 && (
              <>
                <button
                  onClick={() => setView('saved-deals')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <List className="w-4 h-4" />
                  My Deals ({deals.length})
                </button>
                {deals.filter(d => d.analysis).length > 0 && (
                  <button
                    onClick={() => setView('portfolio')}
                    className="flex items-center gap-2 text-slate-300 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <PieChart className="w-4 h-4" />
                    Portfolio
                  </button>
                )}
              </>
            )}
            <AuthButton variant="dark" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-300 text-sm mb-6">
            <TrendingUp className="w-4 h-4" />
            Powered by Gemini AI
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Is the deal
            <span className="text-blue-400"> worth it?</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">
            Analyze Brazilian real estate deals with AI-powered insights, complete tax calculations,
            market comparisons, and Airbnb vs long-term rental projections.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 mb-20">
          <button
            onClick={handleNewDeal}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-5 h-5" />
            Analyze a New Deal
          </button>
          {deals.length > 0 && (
            <button
              onClick={() => setView('saved-deals')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Or view your {deals.length} saved deal{deals.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Brazil focus note */}
        <div className="mt-12 bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
          <p className="text-green-300 font-medium mb-2">🇧🇷 Focused on the Brazilian Market</p>
          <p className="text-slate-400 text-sm">
            Full ITBI, IPTU, Carnê-Leão, and GCAP calculations. SAC & PRICE amortization systems.
            Caixa, FGTS, and Minha Casa Minha Vida program support. Foreign buyer guidance.
          </p>
        </div>
      </main>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🧮',
    title: 'Complete Tax Breakdown',
    desc: 'ITBI, IPTU, Carnê-Leão rental tax, and capital gains (GCAP) — all calculated for your specific buyer profile and Brazilian state.',
  },
  {
    icon: '📊',
    title: 'Market Comparison',
    desc: 'See how your deal compares to similar properties in the area. Price per sqm, yield benchmarks, and recent transactions.',
  },
  {
    icon: '🏠',
    title: 'Airbnb vs Long-Term',
    desc: 'Full rental strategy comparison with Brazilian seasonality data. Break-even occupancy, monthly projections, and STR regulatory alerts.',
  },
  {
    icon: '💰',
    title: 'Financing Analysis',
    desc: 'SAC and PRICE amortization systems. FGTS eligibility, Caixa rates, and Minha Casa Minha Vida program analysis.',
  },
  {
    icon: '📈',
    title: '20-Year Projections',
    desc: 'Cash flow, equity growth, IRR, and inflation-adjusted returns. Sensitivity analysis with adjustable assumptions.',
  },
  {
    icon: '🤖',
    title: 'AI Deal Insights',
    desc: 'Gemini AI analyzes your deal and provides specific advice on negotiation, tax optimization, and rental strategy.',
  },
];
