'use client';

import { useEffect, useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { DealDashboard } from '@/components/deal/DealDashboard';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SharedDealPage({ params }: { params: { token: string } }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [allowEdit, setAllowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/shared-deals/${params.token}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setDeal(json.deal);
        setAllowEdit(json.allowEdit);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-600">Loading shared deal…</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="font-bold text-slate-800 mb-2">Deal not found</h2>
          <p className="text-sm text-slate-600 mb-4">{error || 'This share link may have expired or been removed.'}</p>
          <a href="/" className="text-blue-500 hover:underline text-sm">← Back to CheckDeal</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!allowEdit && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          👁 View-only shared link · <a href="/" className="underline">Open CheckDeal</a> to analyze your own deals
        </div>
      )}
      <DealDashboard
        deal={deal}
        onNewDeal={() => { window.location.href = '/'; }}
        onBack={() => { window.location.href = '/'; }}
        readOnly={!allowEdit}
      />
    </div>
  );
}
