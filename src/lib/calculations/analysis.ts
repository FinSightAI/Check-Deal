import { Deal, DealAnalysis, RiskFactor, ReturnMetrics } from '@/lib/types/deal';
import { calculateBrazilTaxes, calculateBrazilRentalTax } from '@/lib/taxes/brazil';
import { calculateFinancing } from './mortgage';
import { buildCashFlows, calculateReturnMetrics, calculateDealScore } from './returns';
import { calculateRentalAnalysis } from './airbnb';
import { BRAZIL_SELIC_RATE, BRAZIL_IPCA_INFLATION, COUNTRIES } from '@/lib/constants/countries';

export async function runDealAnalysis(deal: Deal, exchangeRates?: Record<string, number>): Promise<DealAnalysis> {
  const { property, financing, buyerProfile, rentalAssumptions, userOverrides } = deal;
  const price = property.agreedPrice || property.askingPrice;

  // ── Step 1: Tax calculations ──────────────────────────────────────────────
  const taxResult = calculateBrazilTaxes(deal);
  const { purchase: purchaseCosts, annual: annualCosts } = taxResult;

  // ── Step 2: Financing ─────────────────────────────────────────────────────
  const financingCalc = calculateFinancing({
    ...financing,
    loanAmount: financing.financingType === 'cash' ? 0 : price - financing.downPaymentAmount,
  });

  // ── Step 3: Rental income tax ─────────────────────────────────────────────
  const isNonResident = buyerProfile.citizenshipStatus === 'foreigner' && !buyerProfile.brazilianCPF;
  const annualRentalTax = calculateBrazilRentalTax(
    rentalAssumptions.ltr.monthlyRent,
    isNonResident,
    buyerProfile.isCompanyPurchase
  );

  // ── Step 4: Cash flows ────────────────────────────────────────────────────
  const appreciationRate = userOverrides.appreciationRateOverride ??
    COUNTRIES['BR'].defaultAppreciation;
  const inflationRate = BRAZIL_IPCA_INFLATION;

  const annualRent = rentalAssumptions.ltr.monthlyRent * 12;
  const annualOperatingCosts = annualCosts.total;
  const annualDebtService = financingCalc.monthlyPayment * 12;

  const cashFlows = buildCashFlows({
    purchasePrice: price,
    totalCashInvested: purchaseCosts.totalCashRequired,
    annualRent,
    annualOperatingCosts,
    annualDebtService,
    annualRentalTax,
    appreciationRate,
    rentGrowthRate: rentalAssumptions.ltr.annualRentGrowthPercent,
    inflationRate,
    vacancyRate: rentalAssumptions.ltr.vacancyRatePercent / 100,
    loanSchedule: financingCalc.schedule,
    projectionYears: 20,
  });

  // ── Step 5: Return metrics ────────────────────────────────────────────────
  const returns = calculateReturnMetrics(
    deal,
    { totalCashRequired: purchaseCosts.totalCashRequired, propertyPrice: price },
    annualRent,
    annualOperatingCosts,
    cashFlows,
    appreciationRate,
    inflationRate
  );

  // ── Step 6: Rental analysis (LTR vs STR) ─────────────────────────────────
  const rentalAnalysis = calculateRentalAnalysis(deal, annualRentalTax);

  // ── Step 7: Deal score ────────────────────────────────────────────────────
  const scoreResult = calculateDealScore(returns, 'BR', cashFlows);
  const dealScore = {
    total: scoreResult.total,
    breakdown: scoreResult.breakdown as DealAnalysis['dealScore']['breakdown'],
    rating: scoreResult.rating as DealAnalysis['dealScore']['rating'],
    recommendation: scoreResult.recommendation as DealAnalysis['dealScore']['recommendation'],
  };

  // ── Step 8: Risk factors ──────────────────────────────────────────────────
  const riskFactors = identifyRiskFactors(deal, returns, financingCalc.effectiveAnnualRate);

  // ── Step 9: Market context ────────────────────────────────────────────────
  // Typical São Paulo yields: 4-7%
  const avgYieldArea = 5.5;
  const avgPricePerSqmArea = estimateAvgPricePerSqm(property.state, property.city);
  const priceVsMarketPercent = ((price / property.sizeSqm - avgPricePerSqmArea) / avgPricePerSqmArea) * 100;

  return {
    runAt: new Date().toISOString(),
    purchaseCosts,
    annualCosts,
    financing: {
      monthlyPayment: financingCalc.monthlyPayment,
      totalInterest: financingCalc.totalInterest,
      effectiveRate: financingCalc.effectiveAnnualRate,
      amortizationType: financingCalc.amortizationType,
    },
    returns,
    cashFlows,
    rentalAnalysis,
    dealScore,
    riskFactors,
    marketContext: {
      priceVsMarketPercent,
      avgPricePerSqmArea,
      avgYieldArea,
      inflationRate,
      selicRate: BRAZIL_SELIC_RATE,
      exchangeRates: exchangeRates || { USD: 0.18, EUR: 0.165, ILS: 0.66 },
    },
  };
}

function identifyRiskFactors(
  deal: Deal,
  returns: ReturnMetrics,
  mortgageRate: number
): RiskFactor[] {
  const risks: RiskFactor[] = [];
  const { property, financing, buyerProfile } = deal;

  // High interest rate vs Selic
  if (mortgageRate > BRAZIL_SELIC_RATE + 4) {
    risks.push({
      category: 'financial',
      severity: 'high',
      title: 'High financing cost',
      description: `Mortgage rate of ${mortgageRate.toFixed(1)}% is significantly above Selic (${BRAZIL_SELIC_RATE}%). Consider alternatives.`,
      mitigation: 'Compare Caixa Econômica Federal rates, which may offer competitive rates for residential properties.',
    });
  }

  // Negative cash flow
  if (returns.cashOnCashReturn < -3) {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'Negative cash flow',
      description: 'Property generates negative monthly cash flow after mortgage and expenses.',
      mitigation: 'Consider higher down payment, longer loan term, or short-term rental to improve cash flow.',
    });
  }

  // Foreign buyer without CPF
  if (buyerProfile.citizenshipStatus === 'foreigner' && !buyerProfile.brazilianCPF) {
    risks.push({
      category: 'regulatory',
      severity: 'high',
      title: 'CPF required',
      description: 'Foreign buyers must obtain a Brazilian CPF (Cadastro de Pessoas Físicas) to purchase property and for tax compliance.',
      mitigation: 'Apply for CPF at a Brazilian consulate or at Receita Federal. Process takes 1-4 weeks.',
    });
  }

  // High condominium fees
  const price = property.agreedPrice || property.askingPrice;
  const condoMonthly = property.condominiumMonthly || 0;
  if (condoMonthly > deal.rentalAssumptions.ltr.monthlyRent * 0.3) {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'High condominium fees',
      description: `Condominium fees (R$${condoMonthly.toLocaleString('pt-BR')}/month) are over 30% of projected rent.`,
      mitigation: 'Verify if extraordinary expenses (obras) are planned. Review the condominium minutes (atas).',
    });
  }

  // No habite-se
  if (!property.hasHabitese && !property.isNewDevelopment) {
    risks.push({
      category: 'regulatory',
      severity: 'high',
      title: 'Missing Habite-se',
      description: 'Property lacks the occupancy permit (Habite-se). This affects financing eligibility and legal use.',
      mitigation: 'Verify with the seller why Habite-se is missing. This may be an illegal conversion or unpermitted addition.',
    });
  }

  // Brazil macro risk
  risks.push({
    category: 'macro',
    severity: 'medium',
    title: 'Brazil interest rate risk',
    description: `Brazil's Selic rate (${BRAZIL_SELIC_RATE}%) is high. Variable rate mortgages may become more expensive if rates rise.`,
    mitigation: 'Prefer fixed-rate (TR + fixed spread) or SAC financing with Caixa to hedge against rate increases.',
  });

  // High loan-to-value
  const ltv = financing.loanAmount / price;
  if (ltv > 0.75) {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'High loan-to-value ratio',
      description: `LTV of ${(ltv * 100).toFixed(0)}% leaves limited equity buffer. Property value decline could result in negative equity.`,
      mitigation: 'Brazilian banks typically finance up to 80% (Caixa) or 70% (private banks) of assessed value.',
    });
  }

  // STR regulatory risk in major cities
  if (deal.rentalAssumptions.strategy === 'short-term' || deal.rentalAssumptions.strategy === 'hybrid') {
    const restrictedCities = ['são paulo', 'rio de janeiro', 'florianópolis'];
    if (restrictedCities.some((c) => property.city.toLowerCase().includes(c))) {
      risks.push({
        category: 'regulatory',
        severity: 'medium',
        title: 'Short-term rental regulation risk',
        description: `${property.city} is considering or has implemented regulations on short-term rentals. Verify current rules.`,
        mitigation: 'Check local municipal ordinances. Some condominiums also prohibit Airbnb in their internal rules (convenção).',
      });
    }
  }

  return risks;
}

function estimateAvgPricePerSqm(state: string, city: string): number {
  // Approximate 2024 values in BRL
  const cityPrices: Record<string, number> = {
    'são paulo': 11500,
    'rio de janeiro': 10000,
    'brasília': 8500,
    'florianópolis': 9000,
    'curitiba': 7500,
    'porto alegre': 6800,
    'belo horizonte': 6500,
    'salvador': 5800,
    'fortaleza': 5200,
    'recife': 5500,
  };

  const cityLower = city.toLowerCase();
  for (const [key, value] of Object.entries(cityPrices)) {
    if (cityLower.includes(key)) return value;
  }

  // State defaults
  const statePrices: Record<string, number> = {
    SP: 8500, RJ: 8000, DF: 8000, SC: 7500, PR: 6500,
    RS: 6000, MG: 5500, GO: 5000, BA: 5000, CE: 4800,
    PE: 5000, DEFAULT: 4500,
  };

  return statePrices[state] || statePrices['DEFAULT'];
}
