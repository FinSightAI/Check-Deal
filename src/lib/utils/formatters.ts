import { CurrencyCode } from '@/lib/types/deal';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BRL: 'R$',
  USD: '$',
  ILS: '₪',
  GBP: '£',
  EUR: '€',
  AED: 'AED ',
};

export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'BRL',
  compact = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency];

  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${symbol}${(value / 1_000).toFixed(0)}K`;
    }
  }

  const formatted = new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return `${symbol}${formatted}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(1)}x`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getRatingColor(rating: string): string {
  switch (rating) {
    case 'excellent': return 'text-emerald-600';
    case 'good': return 'text-green-600';
    case 'fair': return 'text-yellow-600';
    case 'poor': return 'text-orange-600';
    case 'avoid': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export function getRatingBg(rating: string): string {
  switch (rating) {
    case 'excellent': return 'bg-emerald-50 border-emerald-200';
    case 'good': return 'bg-green-50 border-green-200';
    case 'fair': return 'bg-yellow-50 border-yellow-200';
    case 'poor': return 'bg-orange-50 border-orange-200';
    case 'avoid': return 'bg-red-50 border-red-200';
    default: return 'bg-gray-50 border-gray-200';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-700 bg-yellow-50';
    case 'low': return 'text-green-700 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}
