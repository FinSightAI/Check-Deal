'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { ArrowLeft, Plus, Trash2, Building2, Calendar } from 'lucide-react';

interface Props {
  onBack: () => void;
  onSelectDeal: (deal: Deal) => void;
  onNewDeal: () => void;
}

export function SavedDeals({ onBack, onSelectDeal, onNewDeal }: Props) {
  const { deals, deleteDeal } = useDealStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Saved Deals</span>
          </div>
          <button
            onClick={onNewDeal}
            className="flex items-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {deals.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No saved deals yet.</p>
            <button onClick={onNewDeal} className="mt-4 text-blue-500 hover:underline text-sm">
              Analyze your first deal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onSelect={() => onSelectDeal(deal)}
                onDelete={() => deleteDeal(deal.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DealCard({ deal, onSelect, onDelete }: { deal: Deal; onSelect: () => void; onDelete: () => void }) {
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { analysis } = deal;

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800">{deal.name}</h3>
            {analysis && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRatingBg(analysis.dealScore.rating)}`}>
                <span className={getRatingColor(analysis.dealScore.rating)}>
                  {analysis.dealScore.total}/100
                </span>
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}
            {deal.property.city}, {deal.property.state} ·{' '}
            {deal.property.rooms}BR {deal.property.propertyType} ·{' '}
            {deal.property.sizeSqm}m²
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="font-semibold text-slate-700">{formatCurrency(price, 'BRL', true)}</span>
            {analysis && (
              <>
                <span className="text-blue-600">Yield: {formatPercent(analysis.returns.grossYield)}</span>
                <span className="text-emerald-600">Cap: {formatPercent(analysis.returns.capRate)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {new Date(deal.updatedAt).toLocaleDateString()}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
