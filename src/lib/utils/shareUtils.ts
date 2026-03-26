import { Deal } from '@/lib/types/deal';

export function encodeDeal(deal: Deal): string {
  const json = JSON.stringify(deal);
  const encoded = btoa(encodeURIComponent(json));
  return encoded;
}

export function decodeDeal(encoded: string): Deal | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as Deal;
  } catch {
    return null;
  }
}

export function getShareUrl(deal: Deal): string {
  const encoded = encodeDeal(deal);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/share?d=${encoded}`;
}
