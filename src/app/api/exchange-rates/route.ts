import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/BRL', {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      throw new Error('Exchange rate API failed');
    }

    const data = await res.json();

    return NextResponse.json({
      base: 'BRL',
      rates: {
        USD: data.rates?.USD ?? 0.18,
        EUR: data.rates?.EUR ?? 0.165,
        ILS: data.rates?.ILS ?? 0.66,
        GBP: data.rates?.GBP ?? 0.14,
        AED: data.rates?.AED ?? 0.66,
      },
      timestamp: data.time_last_updated,
      source: 'exchangerate-api.com',
    });
  } catch {
    // Fallback rates (approximate BRL to other currencies)
    return NextResponse.json({
      base: 'BRL',
      rates: { USD: 0.18, EUR: 0.165, ILS: 0.66, GBP: 0.14, AED: 0.66 },
      timestamp: Date.now(),
      source: 'fallback',
    });
  }
}
