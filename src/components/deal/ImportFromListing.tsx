'use client';

import { useState } from 'react';
import { useDealStore } from '@/lib/store/dealStore';
import { Sparkles, Link2, FileText, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ExtractedData {
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  propertyType: string | null;
  askingPrice: number | null;
  sizeSqm: number | null;
  rooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  condition: string | null;
  isNewDevelopment: boolean;
  hasHabitese: boolean;
  condominiumMonthly: number | null;
  iptuAnnual: number | null;
  dealName: string | null;
}

interface Props {
  onImported: () => void;
}

export function ImportFromListing({ onImported }: Props) {
  const { currentDeal, updateDeal } = useDealStore();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const extract = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setExtracted(null);

    try {
      const body = mode === 'url' ? { url: input.trim() } : { text: input.trim() };
      const res = await fetch('/api/ai/parse-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setExtracted(data.data);
      } else if (data.source === 'url-failed') {
        // URL was blocked — switch to text mode with helpful message
        setMode('text');
        setError('The listing site blocked direct access. Please copy and paste the listing text below.');
      } else {
        setError(data.error ?? 'Extraction failed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const applyToWizard = () => {
    if (!extracted || !currentDeal) return;

    const prop = currentDeal.property;

    updateDeal({
      name: extracted.dealName ?? currentDeal.name,
      property: {
        ...prop,
        ...(extracted.address ? { address: extracted.address } : {}),
        ...(extracted.city ? { city: extracted.city } : {}),
        ...(extracted.neighborhood ? { neighborhood: extracted.neighborhood } : {}),
        ...(extracted.state ? { state: extracted.state } : {}),
        ...(extracted.propertyType ? { propertyType: extracted.propertyType as typeof prop.propertyType } : {}),
        ...(extracted.askingPrice ? { askingPrice: extracted.askingPrice } : {}),
        ...(extracted.sizeSqm ? { sizeSqm: extracted.sizeSqm } : {}),
        ...(extracted.rooms ? { rooms: extracted.rooms } : {}),
        ...(extracted.bathrooms ? { bathrooms: extracted.bathrooms } : {}),
        ...(extracted.parkingSpaces !== null ? { parkingSpaces: extracted.parkingSpaces ?? 0 } : {}),
        ...(extracted.floor !== null ? { floor: extracted.floor ?? undefined } : {}),
        ...(extracted.totalFloors !== null ? { totalFloors: extracted.totalFloors ?? undefined } : {}),
        ...(extracted.yearBuilt !== null ? { yearBuilt: extracted.yearBuilt ?? undefined } : {}),
        ...(extracted.condition ? { condition: extracted.condition as typeof prop.condition } : {}),
        isNewDevelopment: extracted.isNewDevelopment,
        hasHabitese: extracted.hasHabitese,
        ...(extracted.condominiumMonthly ? { condominiumMonthly: extracted.condominiumMonthly } : {}),
        ...(extracted.iptuAnnual ? { iptuAnnual: extracted.iptuAnnual } : {}),
      },
    });

    onImported();
  };

  const filledCount = extracted
    ? Object.entries(extracted).filter(([k, v]) => v !== null && v !== undefined && k !== 'dealName').length
    : 0;

  const totalFields = 15;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <span className="font-semibold text-slate-800">Import from Listing</span>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI</span>
      </div>
      <p className="text-sm text-slate-500 -mt-2">
        Paste a ZAP Imóveis, VivaReal, or OLX listing URL — or paste the listing text — and Gemini will fill in the property details automatically.
      </p>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        <button
          onClick={() => { setMode('url'); setError(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${mode === 'url' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Link2 className="w-3.5 h-3.5" />
          URL
        </button>
        <button
          onClick={() => { setMode('text'); setError(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${mode === 'text' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Paste Text
        </button>
      </div>

      {/* Input */}
      {mode === 'url' ? (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://www.zapimoveis.com.br/imovel/..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && extract()}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={extract}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Extracting…' : 'Extract'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={6}
            placeholder="Copy and paste the full listing text here — title, description, price, area, rooms, location, condominium fee, IPTU…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
          />
          <button
            onClick={extract}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Analyzing with Gemini…' : 'Extract Property Details'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {extracted && (
        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">
                {extracted.dealName ?? 'Extracted'} — {filledCount}/{totalFields} fields found
              </span>
            </div>
            {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPreview && (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  { label: 'City', value: extracted.city },
                  { label: 'Neighborhood', value: extracted.neighborhood },
                  { label: 'State', value: extracted.state },
                  { label: 'Type', value: extracted.propertyType },
                  { label: 'Price', value: extracted.askingPrice ? `R$ ${extracted.askingPrice.toLocaleString('pt-BR')}` : null },
                  { label: 'Size', value: extracted.sizeSqm ? `${extracted.sizeSqm} m²` : null },
                  { label: 'Rooms', value: extracted.rooms ? `${extracted.rooms} bedrooms` : null },
                  { label: 'Bathrooms', value: extracted.bathrooms },
                  { label: 'Parking', value: extracted.parkingSpaces !== null ? extracted.parkingSpaces : null },
                  { label: 'Floor', value: extracted.floor !== null ? `${extracted.floor}/${extracted.totalFloors ?? '?'}` : null },
                  { label: 'Year built', value: extracted.yearBuilt },
                  { label: 'Condition', value: extracted.condition },
                  { label: 'Condomínio', value: extracted.condominiumMonthly ? `R$ ${extracted.condominiumMonthly.toLocaleString('pt-BR')}/mo` : null },
                  { label: 'IPTU', value: extracted.iptuAnnual ? `R$ ${extracted.iptuAnnual.toLocaleString('pt-BR')}/yr` : null },
                  { label: 'New development', value: extracted.isNewDevelopment ? 'Yes' : 'No' },
                  { label: 'Habite-se', value: extracted.hasHabitese ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500">{label}</span>
                    {value !== null && value !== undefined ? (
                      <span className="font-medium text-slate-800">{String(value)}</span>
                    ) : (
                      <span className="text-slate-300 italic text-xs">not found</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 px-4 py-3 flex justify-between items-center gap-3">
            <p className="text-xs text-slate-400">Review and adjust in the wizard if needed</p>
            <button
              onClick={applyToWizard}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Use These Details
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Works best with ZAP Imóveis, VivaReal, OLX, and Imovelweb. All data is verified by you before use.
      </p>
    </div>
  );
}
