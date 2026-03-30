'use client';

import { useState, useMemo } from 'react';
import { useDealStore } from '@/lib/store/dealStore';
import { Deal, PipelineStatus } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { ArrowLeft, Plus, Trash2, Building2, Calendar, BarChart2, CheckSquare, Search, Copy, SlidersHorizontal, X } from 'lucide-react';

const STATUS_STYLES: Record<PipelineStatus, { label: string; color: string; bg: string }> = {
  exploring:       { label: 'Exploring',     color: 'text-slate-600',   bg: 'bg-slate-100' },
  negotiating:     { label: 'Negotiating',   color: 'text-blue-700',    bg: 'bg-blue-100' },
  'due-diligence': { label: 'Due Diligence', color: 'text-amber-700',   bg: 'bg-amber-100' },
  'offer-made':    { label: 'Offer Made',    color: 'text-purple-700',  bg: 'bg-purple-100' },
  closed:          { label: 'Closed ✓',      color: 'text-emerald-700', bg: 'bg-emerald-100' },
  passed:          { label: 'Passed ✗',      color: 'text-red-600',     bg: 'bg-red-100' },
};

type SortKey = 'date' | 'score' | 'yield' | 'price' | 'name';

interface Props {
  onBack: () => void;
  onSelectDeal: (deal: Deal) => void;
  onNewDeal: () => void;
  onCompare?: (deals: Deal[]) => void;
}

export function SavedDeals({ onBack, onSelectDeal, onNewDeal, onCompare }: Props) {
  const { deals, deleteDeal, duplicateDeal } = useDealStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'all'>('all');
  const [filterCity, setFilterCity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() =>
    [...new Set(deals.map(d => d.property.city).filter(Boolean))].sort(),
    [deals]
  );

  const filtered = useMemo(() => {
    let list = [...deals];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.property.city.toLowerCase().includes(q) ||
        (d.property.neighborhood ?? '').toLowerCase().includes(q) ||
        d.property.state.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter(d => (d.pipelineStatus ?? 'exploring') === filterStatus);
    }

    if (filterCity !== 'all') {
      list = list.filter(d => d.property.city === filterCity);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'score':  return (b.analysis?.dealScore.total ?? -1) - (a.analysis?.dealScore.total ?? -1);
        case 'yield':  return (b.analysis?.returns.grossYield ?? -1) - (a.analysis?.returns.grossYield ?? -1);
        case 'price':  return (b.property.agreedPrice || b.property.askingPrice) - (a.property.agreedPrice || a.property.askingPrice);
        case 'name':   return a.name.localeCompare(b.name);
        default:       return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [deals, search, sortBy, filterStatus, filterCity]);

  const analyzedDeals = deals.filter(d => d.analysis);
  const compareMode = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const activeFilters = (filterStatus !== 'all' ? 1 : 0) + (filterCity !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Saved Deals</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{deals.length}</span>
          </div>
          {compareMode && onCompare && (
            <button
              onClick={() => onCompare(deals.filter(d => selected.has(d.id)))}
              className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg"
            >
              <BarChart2 className="w-4 h-4" />
              Compare {selected.size}
            </button>
          )}
          <button onClick={onNewDeal}
            className="flex items-center gap-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">New Deal</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        {deals.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No saved deals yet.</p>
            <button onClick={onNewDeal} className="text-blue-500 hover:underline text-sm">
              Analyze your first deal →
            </button>
          </div>
        ) : (
          <>
            {/* Search + Sort + Filter bar */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, city, neighborhood…"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortKey)}
                  className="text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-600"
                >
                  <option value="date">Newest</option>
                  <option value="score">Best score</option>
                  <option value="yield">Highest yield</option>
                  <option value="price">Highest price</option>
                  <option value="name">Name A→Z</option>
                </select>

                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`relative flex items-center gap-1.5 text-sm border rounded-xl px-3 py-2 transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-600'}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:block">Filter</span>
                  {activeFilters > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {activeFilters}
                    </span>
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                    <div className="flex flex-wrap gap-1">
                      {(['all', ...Object.keys(STATUS_STYLES)] as (PipelineStatus | 'all')[]).map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            filterStatus === s
                              ? 'bg-blue-500 text-white'
                              : s === 'all' ? 'bg-slate-100 text-slate-600' : `${STATUS_STYLES[s as PipelineStatus].bg} ${STATUS_STYLES[s as PipelineStatus].color}`
                          }`}>
                          {s === 'all' ? 'All' : STATUS_STYLES[s as PipelineStatus].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cities.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">City:</span>
                      <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                        <option value="all">All cities</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {activeFilters > 0 && (
                    <button onClick={() => { setFilterStatus('all'); setFilterCity('all'); }}
                      className="text-xs text-red-500 hover:text-red-700 ml-auto">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results count */}
            {(search || activeFilters > 0) && (
              <p className="text-xs text-slate-400 mb-3">
                {filtered.length} of {deals.length} deals
              </p>
            )}

            {analyzedDeals.length >= 2 && onCompare && !search && (
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                Select up to 3 analyzed deals to compare side-by-side
              </p>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No deals match your search or filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onSelect={() => onSelectDeal(deal)}
                    onDelete={() => { deleteDeal(deal.id); setSelected(prev => { const n = new Set(prev); n.delete(deal.id); return n; }); }}
                    onDuplicate={() => { const copy = duplicateDeal(deal.id); if (copy) onSelectDeal(copy); }}
                    selectable={!!deal.analysis && !!onCompare}
                    selected={selected.has(deal.id)}
                    onToggleSelect={() => toggleSelect(deal.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal, onSelect, onDelete, onDuplicate, selectable, selected, onToggleSelect,
}: {
  deal: Deal; onSelect: () => void; onDelete: () => void; onDuplicate: () => void;
  selectable?: boolean; selected?: boolean; onToggleSelect?: () => void;
}) {
  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { analysis } = deal;
  const status = deal.pipelineStatus ?? 'exploring';

  return (
    <div
      className={`bg-white border-2 rounded-xl p-4 sm:p-5 transition-all cursor-pointer ${
        selected ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
      }`}
      onClick={selectable ? onToggleSelect : onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {selectable && (
            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-800 truncate">{deal.name}</h3>
              {analysis && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${getRatingBg(analysis.dealScore.rating)}`}>
                  <span className={getRatingColor(analysis.dealScore.rating)}>{analysis.dealScore.total}/100</span>
                </span>
              )}
              {status !== 'exploring' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLES[status].bg} ${STATUS_STYLES[status].color}`}>
                  {STATUS_STYLES[status].label}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}
              {deal.property.city}, {deal.property.state} · {deal.property.rooms}BR {deal.property.propertyType} · {deal.property.sizeSqm}m²
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm">
              <span className="font-semibold text-slate-700">{formatCurrency(price, 'BRL', true)}</span>
              {analysis && (
                <>
                  <span className="text-blue-600">Yield {formatPercent(analysis.returns.grossYield)}</span>
                  <span className="text-emerald-600">Cap {formatPercent(analysis.returns.capRate)}</span>
                  <span className="text-slate-400 text-xs hidden sm:inline">
                    CoC {formatPercent(analysis.returns.cashOnCashReturn)}
                  </span>
                </>
              )}
              {!analysis && <span className="text-xs text-slate-400 italic">Not analyzed yet</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="items-center gap-1 text-xs text-slate-400 hidden sm:flex mr-1">
            <Calendar className="w-3 h-3" />
            {new Date(deal.updatedAt).toLocaleDateString()}
          </div>
          {!selectable && (
            <button onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50">
              Open
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate"
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
