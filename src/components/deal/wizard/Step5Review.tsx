'use client';

import { useState } from 'react';
import { useDealStore } from '@/lib/store/dealStore';
import { formatCurrency } from '@/lib/utils/formatters';
import { BR_STATES } from '@/lib/constants/countries';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step5Review({ onComplete, onBack }: Props) {
  const { currentDeal, updateDeal, setAnalysis, setAnalyzing, setAnalysisError, analysisError, isAnalyzing, saveDeal } =
    useDealStore();
  const [dealName, setDealName] = useState(currentDeal?.name || 'My Deal');

  if (!currentDeal) return null;

  const { property, financing, buyerProfile, rentalAssumptions } = currentDeal;
  const price = property.agreedPrice || property.askingPrice;

  const handleAnalyze = async () => {
    // Save name
    updateDeal({ name: dealName });
    setAnalysisError(null);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal: { ...currentDeal, name: dealName } }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const { analysis } = await res.json();
      setAnalysis(analysis);
      saveDeal();
      onComplete();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Review & Analyze</h2>
        <p className="text-slate-500 mt-1">Everything looks good? Run the full analysis.</p>
      </div>

      {/* Deal name */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">Deal Name</label>
        <input
          type="text"
          value={dealName}
          onChange={(e) => setDealName(e.target.value)}
          placeholder="e.g. Itaim Studio - São Paulo"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard title="Buyer Profile" emoji="👤">
          <Row label="Status" value={buyerProfile.citizenshipStatus.replace('-', ' ')} />
          <Row label="CPF" value={buyerProfile.brazilianCPF ? 'Yes' : 'No'} />
          <Row label="Structure" value={buyerProfile.isCompanyPurchase ? 'Company (PJ)' : 'Individual (CPF)'} />
        </SummaryCard>

        <SummaryCard title="Property" emoji="🏠">
          <Row label="Location" value={`${property.city}, ${property.state}`} />
          <Row label="Type" value={`${property.rooms}BR ${property.propertyType}`} />
          <Row label="Size" value={`${property.sizeSqm}m²`} />
          <Row label="Price" value={formatCurrency(price, 'BRL')} highlight />
          {price > 0 && property.sizeSqm > 0 && (
            <Row
              label="R$/m²"
              value={formatCurrency(price / property.sizeSqm, 'BRL')}
            />
          )}
        </SummaryCard>

        <SummaryCard title="Financing" emoji="💰">
          {financing.financingType === 'cash' ? (
            <Row label="Type" value="Cash purchase" />
          ) : (
            <>
              <Row label="Type" value={financing.financingType === 'caixa' ? 'Caixa' : 'Private Bank'} />
              <Row
                label="Down payment"
                value={`${formatCurrency(financing.downPaymentAmount, 'BRL')} (${financing.downPaymentPercent.toFixed(0)}%)`}
              />
              <Row label="Rate" value={`${financing.interestRate}% / year`} />
              <Row label="Term" value={`${financing.loanTermYears} years (${financing.loanType})`} />
              {financing.usesFGTS && <Row label="FGTS" value={formatCurrency(financing.fgtsAmount || 0, 'BRL')} />}
            </>
          )}
        </SummaryCard>

        <SummaryCard title="Rental Strategy" emoji="🏡">
          <Row label="Strategy" value={rentalAssumptions.strategy.replace('-', ' ')} />
          {(rentalAssumptions.strategy === 'long-term' || rentalAssumptions.strategy === 'hybrid') && (
            <>
              <Row label="Monthly rent" value={formatCurrency(rentalAssumptions.ltr.monthlyRent, 'BRL')} />
              <Row
                label="Gross yield"
                value={price > 0
                  ? `${((rentalAssumptions.ltr.monthlyRent * 12 / price) * 100).toFixed(1)}%`
                  : '—'}
                highlight
              />
            </>
          )}
          {(rentalAssumptions.strategy === 'short-term' || rentalAssumptions.strategy === 'hybrid') && (
            <Row label="Airbnb rate" value={`R$${rentalAssumptions.str.avgNightlyRate}/night`} />
          )}
        </SummaryCard>
      </div>

      {/* Brazilian tax preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Estimated Purchase Costs</h3>
        <div className="space-y-2 text-sm">
          <Row label="Property price" value={formatCurrency(price, 'BRL')} />
          <Row
            label={`ITBI (${BR_STATES[property.state]?.itbiRate ?? 3}%)`}
            value={formatCurrency(price * ((BR_STATES[property.state]?.itbiRate ?? 3) / 100), 'BRL')}
          />
          <Row label="Registration & notary (est.)" value="~R$3,000-8,000" />
          <Row label="Legal fees (est.)" value={`~${formatCurrency(Math.max(2000, price * 0.003), 'BRL')}`} />
          {financing.financingType !== 'cash' && (
            <Row label="Mortgage fees (est.)" value="~R$3,000-6,000" />
          )}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <Row
              label="Total costs (est.)"
              value={formatCurrency(price * 0.045, 'BRL')}
              highlight
            />
            <p className="text-xs text-slate-500 mt-1">
              ~4-6% of purchase price. Full breakdown provided after analysis.
            </p>
          </div>
        </div>
      </div>

      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-800">Analysis Error</div>
            <div className="text-sm text-red-700 mt-0.5">{analysisError}</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isAnalyzing}
          className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || price === 0}
          className="flex-2 flex-grow-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing deal...
            </>
          ) : (
            '🔍 Run Full Analysis'
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        {emoji} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-blue-700' : 'text-slate-800'} capitalize`}>
        {value}
      </span>
    </div>
  );
}
