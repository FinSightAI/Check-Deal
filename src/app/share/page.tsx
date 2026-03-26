'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Deal } from '@/lib/types/deal';
import { decodeDeal } from '@/lib/utils/shareUtils';
import { DealDashboard } from '@/components/deal/DealDashboard';
import { Building2 } from 'lucide-react';

function SharePageInner() {
  const searchParams = useSearchParams();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const d = searchParams.get('d');
    if (!d) { setError(true); return; }
    const decoded = decodeDeal(d);
    if (!decoded || !decoded.analysis) { setError(true); return; }
    setDeal(decoded);
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-slate-700 mb-2">Invalid or expired link</h1>
          <p className="text-slate-400 text-sm mb-6">This share link is not valid or has been corrupted.</p>
          <a href="/" className="text-blue-500 hover:underline text-sm">Go to CheckDeal →</a>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading deal...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Read-only banner */}
      <div className="bg-blue-500 text-white text-center text-sm py-2 px-4">
        <span className="font-medium">Shared deal (read-only)</span>
        <span className="mx-2 opacity-60">·</span>
        <a href="/" className="underline hover:no-underline opacity-90">
          Analyze your own deal on CheckDeal →
        </a>
      </div>
      <DealDashboard
        deal={deal}
        onNewDeal={() => window.location.href = '/'}
        onBack={() => window.location.href = '/'}
        readOnly
      />
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Building2 className="w-5 h-5 text-blue-500" />
          Loading...
        </div>
      </div>
    }>
      <SharePageInner />
    </Suspense>
  );
}
