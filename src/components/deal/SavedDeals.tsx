'use client';

import { useState } from 'react';
import { useDealStore } from '@/lib/store/dealStore';
import { Deal, PipelineStatus } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { ArrowLeft, Plus, Trash2, Building2, Calendar, BarChart2, CheckSquare } from 'lucide-react';

const STATUS_STYLES: Record<PipelineStatus, { color: string; bg: string }> = {
  exploring:      { color: 'text-slate-600',   bg: 'bg-slate-100' },
  negotiating:    { color: 'text-blue-700',    bg: 'bg-blue-100' },
  'due-diligence':{ color: 'text-amber-700',   bg: 'bg-amber-100' },
  'offer-made':   { color: 'text-purple-700',  bg: 'bg-purple-100' },
  closed:         { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  passed:         { color: 'text-red-600',     bg: 'bg-red-100' },
};

interface Props {
  onBack: () => void;
  onSelectDeal: (deal: Deal) => void;
  onNewDeal: () => void;
  onCompare?: (deals: Deal[]) => void;
}

export function SavedDeals({ onBack, onSelectDeal, onNewDeal, onCompare }: Props) {
  const { deals, deleteDeal } = useDealStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const analyzedDeals = deals.filter(d => d.analysis);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const compareMode = selected.size > 0;

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
          {compareMode && onCompare && (
            <button
              onClick={() => onCompare(deals.filter(d => selected.has(d.id)))}
              className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              Compare {selected.size}
            </button>
          )}
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
          <>
            {analyzedDeals.length >= 2 && onCompare && (
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                Select up to 3 analyzed deals to compare side-by-side
              </p>
            )}
            <div className="space-y-3">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onSelect={() => onSelectDeal(deal)}
                  onDelete={() => { deleteDeal(deal.id); setSelected(prev => { const n = new Set(prev); n.delete(deal.id); return n; }); }}
                  selectable={!!deal.analysis && !!onCompare}
                  selected={selected.has(deal.id)}
                  onToggleSelect={() => toggleSelect(deal.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal, onSelect, onDelete, selectable, selected, onToggleSelect,
}: {
  deal: Deal; onSelect: () => void; onDelete: () => void;
  selectable?: boolean; selected?: boolean; onToggleSelect?: () => void;
}) {
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { analysis } = deal;

  return (
    <div
      className={`bg-white border-2 rounded-xl p-5 transition-colors cursor-pointer ${selected ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-300'}`}
      onClick={selectable ? onToggleSelect : onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {selectable && (
            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-800">{deal.name}</h3>
              {analysis && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRatingBg(analysis.dealScore.rating)}`}>
                  <span className={getRatingColor(analysis.dealScore.rating)}>
                    {analysis.dealScore.total}/100
                  </span>
                </span>
              )}
              {deal.pipelineStatus && deal.pipelineStatus !== 'exploring' && (() => {
                const s = STATUS_STYLES[deal.pipelineStatus!];
                return (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.color}`}>
                    {deal.pipelineStatus!.replace('-', ' ')}
                  </span>
                );
              })()}
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
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {new Date(deal.updatedAt).toLocaleDateString()}
          </div>
          {!selectable && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="text-xs text-blue-500 hover:underline px-2"
            >
              Open
            </button>
          )}
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
