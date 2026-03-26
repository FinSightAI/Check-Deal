import { CountryCode, CurrencyCode } from '@/lib/types/deal';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  flag: string;
  defaultInflation: number;
  defaultAppreciation: number;
  brokerCommissionPercent: number;
  notes: string[];
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  BR: {
    code: 'BR',
    name: 'Brazil',
    currency: 'BRL',
    flag: '🇧🇷',
    defaultInflation: 4.8, // IPCA 2024 avg
    defaultAppreciation: 6.5, // Historical avg
    brokerCommissionPercent: 6,
    notes: [
      'ITBI: 2-3% depending on municipality',
      'Broker commission (corretagem) is typically 6% paid by seller but affects price',
      'IPTU varies significantly by city and neighborhood',
      'Foreign buyers can purchase freely but need CPF',
      'Condominium fees can be significant (R$500-3000+/month)',
    ],
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    flag: '🇺🇸',
    defaultInflation: 3.0,
    defaultAppreciation: 4.5,
    brokerCommissionPercent: 2.5,
    notes: [],
  },
  IL: {
    code: 'IL',
    name: 'Israel',
    currency: 'ILS',
    flag: '🇮🇱',
    defaultInflation: 3.5,
    defaultAppreciation: 7.0,
    brokerCommissionPercent: 2,
    notes: [],
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    flag: '🇬🇧',
    defaultInflation: 2.5,
    defaultAppreciation: 3.5,
    brokerCommissionPercent: 1.5,
    notes: [],
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    flag: '🇪🇸',
    defaultInflation: 2.8,
    defaultAppreciation: 4.0,
    brokerCommissionPercent: 3,
    notes: [],
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    flag: '🇦🇪',
    defaultInflation: 3.5,
    defaultAppreciation: 5.0,
    brokerCommissionPercent: 2,
    notes: [],
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    flag: '🇩🇪',
    defaultInflation: 2.5,
    defaultAppreciation: 2.5,
    brokerCommissionPercent: 3.57,
    notes: [],
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    flag: '🇵🇹',
    defaultInflation: 2.5,
    defaultAppreciation: 5.0,
    brokerCommissionPercent: 3,
    notes: [],
  },
};

// Brazilian states with ITBI rates
export const BR_STATES: Record<string, { name: string; itbiRate: number; iptuFactor: number }> = {
  SP: { name: 'São Paulo', itbiRate: 3.0, iptuFactor: 1.0 },
  RJ: { name: 'Rio de Janeiro', itbiRate: 2.0, iptuFactor: 0.9 },
  MG: { name: 'Minas Gerais', itbiRate: 3.0, iptuFactor: 0.7 },
  RS: { name: 'Rio Grande do Sul', itbiRate: 3.0, iptuFactor: 0.8 },
  PR: { name: 'Paraná', itbiRate: 2.7, iptuFactor: 0.8 },
  SC: { name: 'Santa Catarina', itbiRate: 2.0, iptuFactor: 0.7 },
  BA: { name: 'Bahia', itbiRate: 3.0, iptuFactor: 0.6 },
  GO: { name: 'Goiás', itbiRate: 3.0, iptuFactor: 0.6 },
  PE: { name: 'Pernambuco', itbiRate: 3.0, iptuFactor: 0.6 },
  CE: { name: 'Ceará', itbiRate: 3.0, iptuFactor: 0.5 },
  AM: { name: 'Amazonas', itbiRate: 2.0, iptuFactor: 0.5 },
  PA: { name: 'Pará', itbiRate: 2.0, iptuFactor: 0.5 },
  ES: { name: 'Espírito Santo', itbiRate: 2.0, iptuFactor: 0.7 },
  MT: { name: 'Mato Grosso', itbiRate: 3.0, iptuFactor: 0.6 },
  MS: { name: 'Mato Grosso do Sul', itbiRate: 2.0, iptuFactor: 0.6 },
  DF: { name: 'Distrito Federal', itbiRate: 3.0, iptuFactor: 1.2 },
  AL: { name: 'Alagoas', itbiRate: 2.0, iptuFactor: 0.5 },
  PI: { name: 'Piauí', itbiRate: 2.0, iptuFactor: 0.4 },
  MA: { name: 'Maranhão', itbiRate: 2.0, iptuFactor: 0.4 },
  SE: { name: 'Sergipe', itbiRate: 2.0, iptuFactor: 0.5 },
  PB: { name: 'Paraíba', itbiRate: 2.0, iptuFactor: 0.5 },
  RN: { name: 'Rio Grande do Norte', itbiRate: 2.0, iptuFactor: 0.5 },
  TO: { name: 'Tocantins', itbiRate: 2.0, iptuFactor: 0.4 },
  RO: { name: 'Rondônia', itbiRate: 2.0, iptuFactor: 0.4 },
  AC: { name: 'Acre', itbiRate: 2.0, iptuFactor: 0.4 },
  RR: { name: 'Roraima', itbiRate: 2.0, iptuFactor: 0.4 },
  AP: { name: 'Amapá', itbiRate: 2.0, iptuFactor: 0.4 },
};

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string; decimals: number }> = {
  BRL: { symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  ILS: { symbol: '₪', name: 'Israeli Shekel', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  AED: { symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
};

// Brazil Selic rate (benchmark interest rate) - updated regularly
export const BRAZIL_SELIC_RATE = 13.25; // % per year as of early 2025
export const BRAZIL_IPCA_INFLATION = 4.8; // % 2024
export const BRAZIL_FGTS_RATE = 8.5; // FGTS correction rate
