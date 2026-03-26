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

    // Fetch exchange rates
    let exchangeRates: Record<string, number> = { USD: 0.18, EUR: 0.165, ILS: 0.66 };
    try {
      const ratesRes = await fetch(
        'https://api.exchangerate-api.com/v4/latest/BRL',
        { next: { revalidate: 3600 } }
      );
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        exchangeRates = {
          USD: ratesData.rates?.USD ?? 0.18,
          EUR: ratesData.rates?.EUR ?? 0.165,
          ILS: ratesData.rates?.ILS ?? 0.66,
          GBP: ratesData.rates?.GBP ?? 0.14,
          AED: ratesData.rates?.AED ?? 0.66,
        };
      }
    } catch {
      // Use fallback rates
    }

    const analysis = await runDealAnalysis(deal, exchangeRates);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
