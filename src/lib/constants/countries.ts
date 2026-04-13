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
    defaultInflation: 3.1,
    defaultAppreciation: 5.0,
    brokerCommissionPercent: 2.5,
    notes: [
      'Transfer tax: 0–2% depending on state/county (TX ~0%, NY ~1.4%, FL ~0.6%)',
      'Property tax: 0.5–2.5%/year (NJ highest ~2.4%, HI lowest ~0.3%)',
      'Depreciation deduction: 27.5-year straight-line on residential buildings',
      '1031 Exchange: defer capital gains by reinvesting in like-kind property within 180 days',
      'FIRPTA: foreign investors have 15% withheld at sale; reclaimed via US tax return',
      'LLC structure recommended for liability protection (pass-through taxation)',
    ],
  },
  IL: {
    code: 'IL',
    name: 'Israel',
    currency: 'ILS',
    flag: '🇮🇱',
    defaultInflation: 3.2,
    defaultAppreciation: 6.5,
    brokerCommissionPercent: 2,
    notes: [
      'Mas Rechisha (purchase tax): 0-10% depending on buyer status and price',
      'First home buyers: 0% up to ₪1,978,745 — significant saving',
      'Investment property: 8% up to ₪5,872,725, 10% above',
      'Annual Arnona (property tax) varies by city: ₪35-95/sqm/year',
      'Rental income: Track 2 (10% flat) is often optimal for investors',
      'Mortgage max LTV: 75% for investment, 70% for non-residents',
    ],
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

// US states with transfer tax rate (%), avg property tax rate (%), state income tax rate (%)
export const US_STATES: Record<string, { name: string; transferTaxRate: number; propertyTaxRate: number; stateTaxRate: number }> = {
  AL: { name: 'Alabama', transferTaxRate: 0.1, propertyTaxRate: 0.42, stateTaxRate: 5.0 },
  AK: { name: 'Alaska', transferTaxRate: 0.0, propertyTaxRate: 1.04, stateTaxRate: 0.0 },
  AZ: { name: 'Arizona', transferTaxRate: 0.0, propertyTaxRate: 0.66, stateTaxRate: 2.5 },
  AR: { name: 'Arkansas', transferTaxRate: 0.33, propertyTaxRate: 0.63, stateTaxRate: 4.7 },
  CA: { name: 'California', transferTaxRate: 0.11, propertyTaxRate: 0.75, stateTaxRate: 13.3 },
  CO: { name: 'Colorado', transferTaxRate: 0.01, propertyTaxRate: 0.55, stateTaxRate: 4.4 },
  CT: { name: 'Connecticut', transferTaxRate: 0.75, propertyTaxRate: 2.15, stateTaxRate: 7.0 },
  DE: { name: 'Delaware', transferTaxRate: 2.0, propertyTaxRate: 0.57, stateTaxRate: 6.6 },
  FL: { name: 'Florida', transferTaxRate: 0.6, propertyTaxRate: 0.91, stateTaxRate: 0.0 },
  GA: { name: 'Georgia', transferTaxRate: 0.1, propertyTaxRate: 0.91, stateTaxRate: 5.75 },
  HI: { name: 'Hawaii', transferTaxRate: 0.1, propertyTaxRate: 0.31, stateTaxRate: 11.0 },
  ID: { name: 'Idaho', transferTaxRate: 0.0, propertyTaxRate: 0.73, stateTaxRate: 6.0 },
  IL: { name: 'Illinois', transferTaxRate: 0.1, propertyTaxRate: 2.08, stateTaxRate: 4.95 },
  IN: { name: 'Indiana', transferTaxRate: 0.0, propertyTaxRate: 0.87, stateTaxRate: 3.15 },
  IA: { name: 'Iowa', transferTaxRate: 0.16, propertyTaxRate: 1.57, stateTaxRate: 6.0 },
  KS: { name: 'Kansas', transferTaxRate: 0.0, propertyTaxRate: 1.33, stateTaxRate: 5.7 },
  KY: { name: 'Kentucky', transferTaxRate: 0.1, propertyTaxRate: 0.86, stateTaxRate: 4.5 },
  LA: { name: 'Louisiana', transferTaxRate: 0.0, propertyTaxRate: 0.56, stateTaxRate: 4.25 },
  ME: { name: 'Maine', transferTaxRate: 0.44, propertyTaxRate: 1.36, stateTaxRate: 7.15 },
  MD: { name: 'Maryland', transferTaxRate: 0.5, propertyTaxRate: 1.09, stateTaxRate: 5.75 },
  MA: { name: 'Massachusetts', transferTaxRate: 0.456, propertyTaxRate: 1.22, stateTaxRate: 5.0 },
  MI: { name: 'Michigan', transferTaxRate: 0.75, propertyTaxRate: 1.54, stateTaxRate: 4.05 },
  MN: { name: 'Minnesota', transferTaxRate: 0.33, propertyTaxRate: 1.12, stateTaxRate: 9.85 },
  MS: { name: 'Mississippi', transferTaxRate: 0.0, propertyTaxRate: 0.66, stateTaxRate: 5.0 },
  MO: { name: 'Missouri', transferTaxRate: 0.0, propertyTaxRate: 1.01, stateTaxRate: 5.3 },
  MT: { name: 'Montana', transferTaxRate: 0.0, propertyTaxRate: 0.84, stateTaxRate: 6.75 },
  NE: { name: 'Nebraska', transferTaxRate: 0.23, propertyTaxRate: 1.73, stateTaxRate: 6.84 },
  NV: { name: 'Nevada', transferTaxRate: 0.0, propertyTaxRate: 0.59, stateTaxRate: 0.0 },
  NH: { name: 'New Hampshire', transferTaxRate: 0.75, propertyTaxRate: 2.09, stateTaxRate: 0.0 },
  NJ: { name: 'New Jersey', transferTaxRate: 1.0, propertyTaxRate: 2.47, stateTaxRate: 10.75 },
  NM: { name: 'New Mexico', transferTaxRate: 0.0, propertyTaxRate: 0.8, stateTaxRate: 5.9 },
  NY: { name: 'New York', transferTaxRate: 1.4, propertyTaxRate: 1.73, stateTaxRate: 10.9 },
  NC: { name: 'North Carolina', transferTaxRate: 0.2, propertyTaxRate: 0.82, stateTaxRate: 4.75 },
  ND: { name: 'North Dakota', transferTaxRate: 0.0, propertyTaxRate: 0.98, stateTaxRate: 2.9 },
  OH: { name: 'Ohio', transferTaxRate: 0.1, propertyTaxRate: 1.59, stateTaxRate: 4.0 },
  OK: { name: 'Oklahoma', transferTaxRate: 0.1, propertyTaxRate: 0.9, stateTaxRate: 4.75 },
  OR: { name: 'Oregon', transferTaxRate: 0.1, propertyTaxRate: 1.01, stateTaxRate: 9.9 },
  PA: { name: 'Pennsylvania', transferTaxRate: 1.0, propertyTaxRate: 1.58, stateTaxRate: 3.07 },
  RI: { name: 'Rhode Island', transferTaxRate: 0.23, propertyTaxRate: 1.53, stateTaxRate: 5.99 },
  SC: { name: 'South Carolina', transferTaxRate: 0.37, propertyTaxRate: 0.57, stateTaxRate: 6.5 },
  SD: { name: 'South Dakota', transferTaxRate: 0.0, propertyTaxRate: 1.22, stateTaxRate: 0.0 },
  TN: { name: 'Tennessee', transferTaxRate: 0.37, propertyTaxRate: 0.71, stateTaxRate: 0.0 },
  TX: { name: 'Texas', transferTaxRate: 0.0, propertyTaxRate: 1.74, stateTaxRate: 0.0 },
  UT: { name: 'Utah', transferTaxRate: 0.0, propertyTaxRate: 0.63, stateTaxRate: 4.65 },
  VT: { name: 'Vermont', transferTaxRate: 1.25, propertyTaxRate: 1.9, stateTaxRate: 8.75 },
  VA: { name: 'Virginia', transferTaxRate: 0.25, propertyTaxRate: 0.82, stateTaxRate: 5.75 },
  WA: { name: 'Washington', transferTaxRate: 1.28, propertyTaxRate: 1.08, stateTaxRate: 0.0 },
  WV: { name: 'West Virginia', transferTaxRate: 0.22, propertyTaxRate: 0.59, stateTaxRate: 6.5 },
  WI: { name: 'Wisconsin', transferTaxRate: 0.3, propertyTaxRate: 1.85, stateTaxRate: 7.65 },
  WY: { name: 'Wyoming', transferTaxRate: 0.0, propertyTaxRate: 0.61, stateTaxRate: 0.0 },
  DC: { name: 'Washington DC', transferTaxRate: 1.1, propertyTaxRate: 0.85, stateTaxRate: 10.75 },
};

// US city price per sqft (USD) — converted to sqm for internal use (×10.764)
export const US_CITY_PRICES_PER_SQFT: Record<string, number> = {
  'new york': 1400, 'new york city': 1400, 'nyc': 1400, 'manhattan': 2200, 'brooklyn': 1000,
  'los angeles': 900, 'la': 900, 'santa monica': 1200, 'beverly hills': 1800,
  'san francisco': 1150, 'sf': 1150, 'oakland': 650,
  'miami': 750, 'miami beach': 1100, 'brickell': 900,
  'chicago': 450, 'austin': 500, 'dallas': 400, 'houston': 350,
  'seattle': 700, 'boston': 850, 'washington': 700, 'dc': 700,
  'denver': 500, 'nashville': 450, 'atlanta': 400, 'phoenix': 350,
  'san diego': 750, 'las vegas': 300, 'portland': 450,
  'orlando': 330, 'tampa': 380, 'fort lauderdale': 500,
  'honolulu': 900, 'hoboken': 800, 'jersey city': 700,
};

export function getUSAvgPricePerSqm(city: string): number {
  const cityLower = city.toLowerCase();
  for (const [key, pricePerSqft] of Object.entries(US_CITY_PRICES_PER_SQFT)) {
    if (cityLower.includes(key)) return Math.round(pricePerSqft * 10.764);
  }
  return Math.round(350 * 10.764); // national median ~$350/sqft
}

// Brazil macro rates
export const BRAZIL_SELIC_RATE = 13.25; // % per year as of early 2025
export const BRAZIL_IPCA_INFLATION = 4.8; // % 2024
export const BRAZIL_FGTS_RATE = 8.5; // FGTS correction rate

// US macro rates
export const USA_FED_RATE = 4.5; // Federal Funds rate (early 2025)
export const USA_INFLATION = 3.1; // CPI 2024/2025 estimate
export const USA_30YR_FIXED = 6.9; // 30-year fixed mortgage rate (early 2025)

// Israel macro rates
export const ISRAEL_PRIME_RATE = 5.75; // Bank of Israel prime rate (2025)
export const ISRAEL_INFLATION = 3.2; // CPI 2024/2025 estimate

// Israeli cities with approximate price per sqm (₪, 2025)
export const IL_CITY_PRICES: Record<string, number> = {
  'tel aviv': 68000,
  'תל אביב': 68000,
  'ramat gan': 42000,
  'רמת גן': 42000,
  'herzliya': 48000,
  'הרצליה': 48000,
  'raanana': 38000,
  "ra'anana": 38000,
  'רעננה': 38000,
  'kfar saba': 33000,
  'כפר סבא': 33000,
  'petah tikva': 30000,
  'פתח תקווה': 30000,
  'rishon lezion': 28000,
  'ראשון לציון': 28000,
  'holon': 26000,
  'חולון': 26000,
  'bat yam': 22000,
  'בת ים': 22000,
  'jerusalem': 32000,
  'ירושלים': 32000,
  'haifa': 24000,
  'חיפה': 24000,
  'netanya': 26000,
  'נתניה': 26000,
  'ashdod': 22000,
  'אשדוד': 22000,
  'ashkelon': 18000,
  'אשקלון': 18000,
  'beer sheva': 14000,
  "be'er sheva": 14000,
  'באר שבע': 14000,
  'eilat': 18000,
  'אילת': 18000,
  'modiin': 28000,
  'מודיעין': 28000,
  'rehovot': 27000,
  'רחובות': 27000,
  'givatayim': 42000,
  'גבעתיים': 42000,
  'bnei brak': 28000,
  'בני ברק': 28000,
};

export function getILAvgPricePerSqm(city: string): number {
  const cityLower = city.toLowerCase();
  for (const [key, price] of Object.entries(IL_CITY_PRICES)) {
    if (cityLower.includes(key)) return price;
  }
  return 25000; // national average estimate
}
