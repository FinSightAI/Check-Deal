import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache 1 hour

async function fetchSelic(): Promise<number | null> {
  try {
    // BCB series 432 = Selic meta target (% annual)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const val = parseFloat(data[0]?.valor?.replace(',', '.'));
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

async function fetchIPCA(): Promise<number | null> {
  try {
    // BCB series 13522 = IPCA accumulated 12 months (%)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const val = parseFloat(data[0]?.valor?.replace(',', '.'));
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  try {
    // frankfurter.app — free, no key needed
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=BRL&to=USD,ILS,EUR,GBP,AED',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [selic, ipca, rates] = await Promise.all([fetchSelic(), fetchIPCA(), fetchExchangeRates()]);

  return NextResponse.json({
    selic: selic ?? 13.25,
    ipca: ipca ?? 4.8,
    exchangeRates: rates ?? { USD: 0.18, ILS: 0.65, EUR: 0.17, GBP: 0.14, AED: 0.66 },
    live: { selic: selic !== null, ipca: ipca !== null, exchangeRates: rates !== null },
    fetchedAt: new Date().toISOString(),
  });
}
