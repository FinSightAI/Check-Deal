import { NextRequest, NextResponse } from 'next/server';
import { runDealAnalysis } from '@/lib/calculations/analysis';
import { Deal } from '@/lib/types/deal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deal: Deal = body.deal;

    if (!deal) {
      return NextResponse.json({ error: 'Deal data is required' }, { status: 400 });
    }

    // Fetch live rates from our cached /api/rates endpoint (BCB + frankfurter.app)
    let exchangeRates: Record<string, number> = { USD: 0.18, EUR: 0.165, ILS: 0.65, GBP: 0.14, AED: 0.66 };
    let liveRates = { selic: 13.25, ipca: 4.8 };

    try {
      const baseUrl = req.headers.get('origin') || 'http://localhost:3001';
      const ratesRes = await fetch(`${baseUrl}/api/rates`, { next: { revalidate: 3600 } });
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        exchangeRates = ratesData.exchangeRates ?? exchangeRates;
        liveRates = { selic: ratesData.selic ?? 13.25, ipca: ratesData.ipca ?? 4.8 };
      }
    } catch {
      // Use fallback rates silently
    }

    const analysis = await runDealAnalysis(deal, exchangeRates, liveRates);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
