'use client';

import { useState } from 'react';
import { DEAL_TEMPLATES, DealTemplate } from '@/lib/utils/dealTemplates';
import { useDealStore } from '@/lib/store/dealStore';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSelect: () => void; // called after template applied, navigate to wizard
}

type MarketFilter = 'all' | 'BR' | 'IL' | 'US';

const MARKET_FILTERS: { id: MarketFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'BR', label: '🇧🇷 Brazil' },
  { id: 'IL', label: '🇮🇱 Israel' },
  { id: 'US', label: '🇺🇸 USA' },
];

export function DealTemplates({ onClose, onSelect }: Props) {
  const { createDeal, updateDeal } = useDealStore();
  const [filter, setFilter] = useState<MarketFilter>('all');

  const handleSelect = (template: DealTemplate) => {
    const deal = createDeal();
    updateDeal({ ...template.overrides, id: deal.id });
    // Also reset financing defaults for the market
    const country = (template.overrides.property as { country?: string })?.country;
    if (country === 'IL' || country === 'US') {
      useDealStore.getState().updateMarket(country as 'IL' | 'US');
    }
    onSelect();
  };

  const filtered = filter === 'all'
    ? DEAL_TEMPLATES
    : DEAL_TEMPLATES.filter(t => {
        const country = (t.overrides.property as { country?: string })?.country;
        return country === filter;
      });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Start from a Template</h2>
            <p className="text-sm text-slate-500 mt-0.5">Pre-filled scenarios for Brazil 🇧🇷, Israel 🇮🇱, and the US 🇺🇸</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Market filter tabs */}
        <div className="flex gap-2 px-4 pt-3 pb-1 flex-shrink-0">
          {MARKET_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div className="overflow-y-auto p-4 space-y-3">
          {filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full text-left bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{template.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                      {template.name}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0">
                      {template.typical}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{template.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 sm:hidden">{template.typical}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Start blank instead
          </button>
        </div>
      </div>
    </div>
  );
}
