import { Deal, DealAnalysis, RiskFactor, ReturnMetrics } from '@/lib/types/deal';
import { calculateTaxes, calculateRentalTax } from '@/lib/taxes/index';
import { calculateFinancing } from './mortgage';
import { buildCashFlows, calculateReturnMetrics, calculateDealScore } from './returns';
import { calculateRentalAnalysis } from './airbnb';
import { BRAZIL_SELIC_RATE, BRAZIL_IPCA_INFLATION, ISRAEL_PRIME_RATE, ISRAEL_INFLATION, USA_FED_RATE, USA_INFLATION, COUNTRIES, getILAvgPricePerSqm, getUSAvgPricePerSqm, US_STATES } from '@/lib/constants/countries';

export async function runDealAnalysis(deal: Deal, exchangeRates?: Record<string, number>, liveRates?: { selic?: number; ipca?: number }): Promise<DealAnalysis> {
  const { property, financing, buyerProfile, rentalAssumptions, userOverrides } = deal;
  const price = property.agreedPrice || property.askingPrice;

  // ── Step 1: Tax calculations ──────────────────────────────────────────────
  const taxResult = calculateTaxes(deal);
  const { purchase: purchaseCosts, annual: annualCosts } = taxResult;

  // ── Step 2: Financing ─────────────────────────────────────────────────────
  const financingCalc = calculateFinancing({
    ...financing,
    loanAmount: financing.financingType === 'cash' ? 0 : price - financing.downPaymentAmount,
  });

  // ── Step 3: Rental income tax ─────────────────────────────────────────────
  const annualRentalTax = calculateRentalTax(deal, rentalAssumptions.ltr.monthlyRent);

  // ── Step 4: Cash flows ────────────────────────────────────────────────────
  const country = property.country;
  const countryConfig = COUNTRIES[country] ?? COUNTRIES['BR'];
  const appreciationRate = userOverrides.appreciationRateOverride ?? countryConfig.defaultAppreciation;

  const inflationRate = country === 'IL'
    ? (liveRates?.ipca ?? ISRAEL_INFLATION)
    : country === 'US'
    ? USA_INFLATION
    : (liveRates?.ipca ?? BRAZIL_IPCA_INFLATION);

  const selicRate = country === 'IL'
    ? ISRAEL_PRIME_RATE
    : country === 'US'
    ? USA_FED_RATE
    : (liveRates?.selic ?? BRAZIL_SELIC_RATE);

  const benchmarkRateName = country === 'IL' ? 'Prime Rate' : country === 'US' ? 'Fed Rate' : 'Selic';

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
  const scoreResult = calculateDealScore(returns, country, cashFlows);
  const dealScore = {
    total: scoreResult.total,
    breakdown: scoreResult.breakdown as DealAnalysis['dealScore']['breakdown'],
    rating: scoreResult.rating as DealAnalysis['dealScore']['rating'],
    recommendation: scoreResult.recommendation as DealAnalysis['dealScore']['recommendation'],
  };

  // ── Step 8: Risk factors ──────────────────────────────────────────────────
  const riskFactors = identifyRiskFactors(deal, returns, financingCalc.effectiveAnnualRate, selicRate);

  // ── Step 9: Market context ────────────────────────────────────────────────
  const avgYieldArea = country === 'IL' ? 3.5 : country === 'US' ? 5.0 : 5.5;
  const avgPricePerSqmArea = country === 'IL'
    ? getILAvgPricePerSqm(property.city)
    : country === 'US'
    ? getUSAvgPricePerSqm(property.city)
    : estimateAvgPricePerSqm(property.state, property.city);
  const priceVsMarketPercent = property.sizeSqm > 0
    ? ((price / property.sizeSqm - avgPricePerSqmArea) / avgPricePerSqmArea) * 100
    : 0;

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
      selicRate,
      benchmarkRateName,
      exchangeRates: exchangeRates || { USD: 0.18, EUR: 0.165, ILS: 0.66 },
    },
  };
}

function identifyRiskFactors(
  deal: Deal,
  returns: ReturnMetrics,
  mortgageRate: number,
  benchmarkRate: number = BRAZIL_SELIC_RATE
): RiskFactor[] {
  const risks: RiskFactor[] = [];
  const { property, financing, buyerProfile } = deal;
  const price = property.agreedPrice || property.askingPrice;
  const isIsrael = property.country === 'IL';
  const isUSA = property.country === 'US';

  // High interest rate vs benchmark
  if (mortgageRate > benchmarkRate + 4) {
    risks.push({
      category: 'financial',
      severity: 'high',
      title: 'High financing cost',
      description: `Mortgage rate of ${mortgageRate.toFixed(1)}% is significantly above the benchmark (${benchmarkRate}%). Consider alternatives.`,
      mitigation: isIsrael
        ? 'Compare rates across Israeli banks (Hapoalim, Leumi, Discount). Consider a mixed-route mortgage (combination of fixed + variable tracks).'
        : isUSA
        ? 'Shop multiple lenders (banks, credit unions, mortgage brokers). DSCR loans may offer better terms for investment properties.'
        : 'Compare Caixa Econômica Federal rates, which may offer competitive rates for residential properties.',
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

  // Market-specific regulatory requirements
  if (buyerProfile.citizenshipStatus === 'foreigner') {
    if (!isIsrael && !isUSA && !buyerProfile.brazilianCPF) {
      risks.push({
        category: 'regulatory',
        severity: 'high',
        title: 'CPF required (Brazil)',
        description: 'Foreign buyers must obtain a Brazilian CPF (Cadastro de Pessoas Físicas) to purchase property and for tax compliance.',
        mitigation: 'Apply for CPF at a Brazilian consulate or at Receita Federal. Process takes 1-4 weeks.',
      });
    }
    if (isIsrael) {
      risks.push({
        category: 'regulatory',
        severity: 'medium',
        title: 'Foreign buyer restrictions (Israel)',
        description: 'Non-residents face higher Mas Rechisha (8%+) and a max LTV of 70% for mortgage financing.',
        mitigation: 'Work with an Israeli lawyer and bank early. Ensure funds are legally transferred and documented.',
      });
    }
    if (isUSA) {
      risks.push({
        category: 'regulatory',
        severity: 'medium',
        title: 'FIRPTA withholding (US)',
        description: 'Foreign persons have 15% of gross sale price withheld at closing under FIRPTA. Rental income subject to 30% gross withholding unless W-8ECI filed.',
        mitigation: 'File Form W-8ECI to elect ECI treatment on rental income. Consult a US CPA specializing in non-resident investors.',
      });
    }
  }

  // High building fees vs rent
  const condoMonthly = property.condominiumMonthly || 0;
  if (condoMonthly > deal.rentalAssumptions.ltr.monthlyRent * 0.3) {
    const currencySymbol = isIsrael ? '₪' : isUSA ? '$' : 'R$';
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: isIsrael ? 'High Vaad Bayit fees' : isUSA ? 'High HOA fees' : 'High condominium fees',
      description: `Building fees (${currencySymbol}${condoMonthly.toLocaleString()}/month) are over 30% of projected rent.`,
      mitigation: isIsrael
        ? 'Review the vaad bayit budget and planned building expenses.'
        : isUSA
        ? 'Review HOA financials, reserve funds, and any pending special assessments before closing.'
        : 'Verify if extraordinary expenses (obras) are planned. Review the condominium minutes (atas).',
    });
  }

  // Missing occupancy permit (Brazil only)
  if (!isIsrael && !isUSA && !property.hasHabitese && !property.isNewDevelopment) {
    risks.push({
      category: 'regulatory',
      severity: 'high',
      title: 'Missing Habite-se',
      description: 'Property lacks the occupancy permit (Habite-se). This affects financing eligibility and legal use.',
      mitigation: 'Verify with the seller why Habite-se is missing. This may be an illegal conversion or unpermitted addition.',
    });
  }

  // Macro risk
  risks.push({
    category: 'macro',
    severity: isUSA ? 'low' : 'medium',
    title: isIsrael ? 'Israel interest rate risk' : isUSA ? 'US interest rate risk' : 'Brazil interest rate risk',
    description: isIsrael
      ? `Bank of Israel prime rate (${benchmarkRate}%) affects variable-rate (prime-linked) mortgages. Rates may shift.`
      : isUSA
      ? `Federal Reserve rate (${benchmarkRate}%) drives mortgage rates. 30-yr fixed currently ~6.9%. Rate cuts could improve cash flow.`
      : `Brazil's Selic rate (${benchmarkRate}%) is high. Variable rate mortgages may become more expensive if rates rise.`,
    mitigation: isIsrael
      ? 'Consider a fixed-rate mortgage track (ribit kvua) for portion of the loan to hedge rate risk.'
      : isUSA
      ? 'Lock in a 30-year fixed rate for predictability. Consider refinancing if rates drop significantly.'
      : 'Prefer fixed-rate (TR + fixed spread) or SAC financing with Caixa to hedge against rate increases.',
  });

  // High loan-to-value
  const ltv = price > 0 ? financing.loanAmount / price : 0;
  if (ltv > 0.75) {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'High loan-to-value ratio',
      description: `LTV of ${(ltv * 100).toFixed(0)}% leaves limited equity buffer. Property value decline could result in negative equity.`,
      mitigation: isIsrael
        ? 'Israeli banks allow max 75% LTV for investment properties, 70% for non-residents.'
        : isUSA
        ? 'US lenders typically require 20-25% down for investment properties. PMI adds cost if below 20%.'
        : 'Brazilian banks typically finance up to 80% (Caixa) or 70% (private banks) of assessed value.',
    });
  }

  // STR regulatory risk
  if (deal.rentalAssumptions.strategy === 'short-term' || deal.rentalAssumptions.strategy === 'hybrid') {
    if (isIsrael) {
      risks.push({
        category: 'regulatory',
        severity: 'medium',
        title: 'Short-term rental regulation (Israel)',
        description: 'Airbnb in Israel faces restrictions in some municipalities and buildings. Tel Aviv requires registration.',
        mitigation: "Check building rules (takkanon) and Tel Aviv municipality's STR licensing requirements.",
      });
    } else if (isUSA) {
      const restrictedUSCities = ['new york', 'san francisco', 'los angeles', 'miami beach', 'santa monica', 'denver', 'boston'];
      const cityLower = property.city.toLowerCase();
      if (restrictedUSCities.some((c) => cityLower.includes(c))) {
        risks.push({
          category: 'regulatory',
          severity: 'high',
          title: `STR restrictions in ${property.city}`,
          description: `${property.city} has strict short-term rental regulations — may require owner-occupancy, annual permits, or be effectively banned.`,
          mitigation: 'Verify current local STR ordinance and HOA rules before assuming Airbnb income. Consider long-term rental as primary strategy.',
        });
      }
    } else {
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
