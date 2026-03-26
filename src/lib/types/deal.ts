export type CountryCode = 'BR' | 'US' | 'IL' | 'UK' | 'ES' | 'AE' | 'DE' | 'PT';
export type CurrencyCode = 'BRL' | 'USD' | 'ILS' | 'GBP' | 'EUR' | 'AED';
export type PropertyType = 'apartment' | 'house' | 'condo' | 'commercial' | 'land' | 'studio';
export type PurchaseStrategy = 'buy-to-let' | 'buy-to-sell' | 'primary-residence' | 'vacation';
export type RentalStrategy = 'long-term' | 'short-term' | 'hybrid' | 'none';
export type ConditionType = 'new' | 'excellent' | 'good' | 'needs-work' | 'renovation';
export type CitizenshipStatus = 'citizen' | 'permanent-resident' | 'temporary-resident' | 'foreigner';
export type TaxResidencyCode = 'IL' | 'US' | 'UK' | 'DE' | 'PT' | 'ES' | 'AE' | 'RO' | 'FR' | 'BR' | 'OTHER';

export interface BuyerProfile {
  citizenshipStatus: CitizenshipStatus;
  // Multiple citizenships/passports
  nationalities: CountryCode[];
  // TAX RESIDENCY — where you actually pay taxes (may differ from citizenship)
  taxResidency: TaxResidencyCode;
  isRomanianPassportHolder: boolean; // EU passport via Romania
  isEUCitizen: boolean; // Any EU passport
  brazilianCPF: boolean;
  isCompanyPurchase: boolean;
  existingPropertiesInBrazil: number;
  existingPropertiesAbroad: number;
  annualIncomeUSD?: number;
  isFirstHomeBuyer: boolean;
}

export interface PropertyDetails {
  address: string;
  city: string;
  neighborhood: string;
  state: string; // Brazilian state: SP, RJ, MG, etc.
  country: CountryCode;
  propertyType: PropertyType;
  purchaseStrategy: PurchaseStrategy;

  askingPrice: number;
  agreedPrice?: number;
  currency: CurrencyCode;

  sizeSqm: number;
  rooms: number;
  bathrooms: number;
  parkingSpaces: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  condition: ConditionType;
  isNewDevelopment: boolean; // Novo empreendimento

  // Brazilian-specific
  hasHabitese: boolean; // Habite-se (occupancy permit)
  condominiumMonthly?: number; // Condomínio
  iptuAnnual?: number; // Imposto Predial e Territorial Urbano
}

export interface FinancingDetails {
  financingType: 'cash' | 'mortgage' | 'caixa' | 'private-bank'; // caixa = Caixa Econômica Federal
  downPaymentAmount: number;
  downPaymentPercent: number;
  loanAmount: number;
  interestRate: number; // Annual %
  loanTermYears: number;
  loanType: 'fixed' | 'variable' | 'SAC' | 'PRICE'; // SAC and PRICE are Brazilian amortization systems

  // Brazilian specifics
  usesFGTS: boolean; // FGTS (Severance Fund) for down payment
  fgtsAmount?: number;
  financedByMCMV: boolean; // Minha Casa Minha Vida program

  monthlyPayment?: number;
  totalInterestPaid?: number;
}

export interface RentalAssumptions {
  strategy: RentalStrategy;

  ltr: {
    monthlyRent: number;
    annualRentGrowthPercent: number;
    vacancyRatePercent: number;
    managementFeePercent: number;
    maintenancePercent: number;
    insurance: number;
  };

  str: {
    avgNightlyRate: number;
    occupancyRatePercent: number;
    cleaningFeePerStay: number;
    platformCommissionPercent: number;
    managementFeePercent: number;
    maintenancePercent: number;
    insurance: number;
    utilitiesMontly: number;
    monthlyMultipliers: number[];
  };
}

export interface UserOverrides {
  customBrokerFee?: number;
  customITBI?: number;
  customRegistrationFee?: number;
  customRenovation?: number;
  localMarketRentEstimate?: number;
  airbnbEstimate?: { avgNightly: number; occupancy: number };
  appreciationRateOverride?: number;
  notes?: string;
}

export interface Deal {
  id: string;
  name: string;
  status: 'draft' | 'analyzing' | 'complete';
  createdAt: string;
  updatedAt: string;

  buyerProfile: BuyerProfile;
  property: PropertyDetails;
  financing: FinancingDetails;
  rentalAssumptions: RentalAssumptions;
  userOverrides: UserOverrides;

  analysis?: DealAnalysis;
  aiInsights?: AIInsights;
}

export interface PurchaseCostBreakdown {
  propertyPrice: number;
  itbi: number; // Imposto de Transmissão de Bens Imóveis (2-3%)
  registrationFee: number; // Cartório / registro
  brokerCommission: number; // Corretagem (6% standard in Brazil)
  legalFees: number;
  mortgageArrangementFee?: number;
  evaluationFee?: number; // Avaliação do imóvel
  renovationBudget: number;
  furnitureBudget: number;
  otherCosts: number;
  totalTransactionCosts: number;
  totalCashRequired: number;
}

export interface AnnualCostBreakdown {
  iptu: number; // Imposto Predial e Territorial Urbano
  condominium: number; // Condomínio
  insurance: number;
  maintenance: number;
  managementFee: number;
  total: number;
}

export interface ReturnMetrics {
  grossYield: number;
  netYield: number;
  capRate: number;
  cashOnCashReturn: number;
  paybackYears: number;
  pricePerSqm: number;
  rentPerSqm?: number;

  projections: {
    years: number;
    projectedValue: number;
    totalReturn: number;
    annualizedReturn: number;
    equityBuilt: number;
    totalCashFlow: number;
    irr: number;
  }[];

  realCapRate: number;
  breakEvenOccupancy?: number;
}

export interface YearlyCashFlow {
  year: number;
  rentalIncome: number;
  mortgage: number;
  iptu: number;
  condominium: number;
  insurance: number;
  maintenance: number;
  managementFee: number;
  vacancy: number;
  noi: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  taxableIncome: number;
  incomeTax: number;
  netAfterTax: number;
}

export interface RentalAnalysis {
  ltr: {
    grossAnnualIncome: number;
    netAnnualIncome: number;
    grossYield: number;
    netYield: number;
    monthlyNetIncome: number;
    vacancyLoss: number;
    taxOnRent: number;
  };
  str: {
    grossAnnualRevenue: number;
    netAnnualIncome: number;
    grossYield: number;
    netYield: number;
    monthlyAvgIncome: number;
    occupancyRate: number;
    avgNightlyRate: number;
    peakMonthRevenue: number;
    lowMonthRevenue: number;
    breakEvenOccupancy: number;
    taxOnIncome: number;
    monthlyBreakdown: { month: string; income: number; occupancy: number }[];
  };
  recommendedStrategy: RentalStrategy;
  strPremiumPercent: number;
}

export interface DealScore {
  total: number;
  breakdown: {
    yield: number;
    cashFlow: number;
    appreciation: number;
    risk: number;
    marketTiming: number;
  };
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'avoid';
  recommendation: 'strong-buy' | 'buy' | 'hold' | 'pass' | 'avoid';
}

export interface RiskFactor {
  category: 'financial' | 'market' | 'regulatory' | 'property' | 'macro';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  mitigation?: string;
}

export interface DealAnalysis {
  runAt: string;
  purchaseCosts: PurchaseCostBreakdown;
  annualCosts: AnnualCostBreakdown;
  financing: {
    monthlyPayment: number;
    totalInterest: number;
    effectiveRate: number;
    amortizationType: string;
  };
  returns: ReturnMetrics;
  cashFlows: YearlyCashFlow[];
  rentalAnalysis: RentalAnalysis;
  dealScore: DealScore;
  riskFactors: RiskFactor[];
  marketContext: {
    priceVsMarketPercent: number;
    avgPricePerSqmArea: number;
    avgYieldArea: number;
    inflationRate: number;
    selicRate: number; // Brazil's benchmark interest rate
    fipeBenchmark?: number;
    exchangeRates: Record<string, number>;
  };
}

export interface AIInsights {
  generatedAt: string;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: DealScore['recommendation'];
  marketContext: string;
  taxAdvice: string;
  rentalAdvice: string;
  negotiationTips: string[];
  specificAdvice: string[];
}
