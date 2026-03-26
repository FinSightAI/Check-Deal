import { Deal, DealAnalysis, YearlyCashFlow, ReturnMetrics } from '@/lib/types/deal';
import { getLoanBalanceAtYear } from './mortgage';
import { AmortizationRow } from './mortgage';

interface CashFlowInputs {
  purchasePrice: number;
  totalCashInvested: number; // down payment + closing costs
  annualRent: number;
  annualOperatingCosts: number; // IPTU + condo + insurance + maintenance + management
  annualDebtService: number; // mortgage payments
  annualRentalTax: number;
  appreciationRate: number; // % per year
  rentGrowthRate: number; // % per year
  inflationRate: number;
  vacancyRate: number; // fraction
  loanSchedule: AmortizationRow[];
  projectionYears: number;
}

export function buildCashFlows(inputs: CashFlowInputs): YearlyCashFlow[] {
  const {
    purchasePrice,
    totalCashInvested,
    annualRent,
    annualOperatingCosts,
    annualDebtService,
    annualRentalTax,
    appreciationRate,
    rentGrowthRate,
    inflationRate,
    vacancyRate,
    loanSchedule,
    projectionYears,
  } = inputs;

  const flows: YearlyCashFlow[] = [];
  let cumulativeCashFlow = -totalCashInvested;

  for (let year = 1; year <= projectionYears; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    const grossRent = annualRent * Math.pow(1 + rentGrowthRate / 100, year - 1);
    const vacancyLoss = grossRent * vacancyRate;
    const effectiveRent = grossRent - vacancyLoss;

    // Operating costs grow with inflation
    const inflatedCosts = annualOperatingCosts * Math.pow(1 + inflationRate / 100, year - 1);

    const iptuEstimate = inflatedCosts * 0.2; // Approximate breakdown
    const condoEstimate = inflatedCosts * 0.4;
    const insuranceEstimate = inflatedCosts * 0.05;
    const maintenanceEstimate = inflatedCosts * 0.25;
    const managementFeeEstimate = inflatedCosts * 0.1;

    const noi = effectiveRent - inflatedCosts;
    const cashFlow = noi - annualDebtService;

    // Tax on rental income
    const taxableRental = Math.max(0, effectiveRent - inflatedCosts);
    const rentalTaxThisYear = taxableRental * (annualRentalTax / (annualRent > 0 ? annualRent : 1));

    const netAfterTax = cashFlow - rentalTaxThisYear;

    cumulativeCashFlow += netAfterTax;

    const loanBalance = getLoanBalanceAtYear(loanSchedule, year);
    const equity = propertyValue - loanBalance;

    flows.push({
      year,
      rentalIncome: effectiveRent,
      mortgage: annualDebtService,
      iptu: iptuEstimate,
      condominium: condoEstimate,
      insurance: insuranceEstimate,
      maintenance: maintenanceEstimate,
      managementFee: managementFeeEstimate,
      vacancy: vacancyLoss,
      noi,
      cashFlow,
      cumulativeCashFlow,
      propertyValue,
      loanBalance,
      equity,
      taxableIncome: taxableRental,
      incomeTax: rentalTaxThisYear,
      netAfterTax,
    });
  }

  return flows;
}

export function calculateReturnMetrics(
  deal: Deal,
  purchaseCosts: { totalCashRequired: number; propertyPrice: number },
  annualRent: number,
  annualCosts: number,
  cashFlows: YearlyCashFlow[],
  appreciationRate: number,
  inflationRate: number
): ReturnMetrics {
  const price = purchaseCosts.propertyPrice;
  const totalInvested = purchaseCosts.totalCashRequired;

  // Basic yield metrics
  const grossYield = (annualRent / price) * 100;
  const noi = annualRent * (1 - deal.rentalAssumptions.ltr.vacancyRatePercent / 100) - annualCosts;
  const netYield = (noi / price) * 100;
  const capRate = (noi / price) * 100;

  // Year 1 cash flow
  const yr1 = cashFlows[0];
  const cashOnCashReturn = totalInvested > 0 ? (yr1?.cashFlow / totalInvested) * 100 : 0;

  // Payback period
  let paybackYears = 0;
  for (const flow of cashFlows) {
    if (flow.cumulativeCashFlow >= 0) {
      paybackYears = flow.year;
      break;
    }
  }

  // Price per sqm
  const pricePerSqm = price / deal.property.sizeSqm;
  const rentPerSqm = deal.rentalAssumptions.ltr.monthlyRent / deal.property.sizeSqm;

  // Projections at 5, 10, 20 years
  const projectionYearsList = [5, 10, 20];
  const projections = projectionYearsList.map((years) => {
    const flowAtYear = cashFlows.find((f) => f.year === years);
    if (!flowAtYear) return null;

    const projectedValue = flowAtYear.propertyValue;
    const remainingLoan = flowAtYear.loanBalance;

    // Total return = equity gain + cumulative cash flows
    const equityBuilt = flowAtYear.equity - (price - (deal.financing.loanAmount || 0));
    const totalCashFlow = flowAtYear.cumulativeCashFlow + totalInvested; // Add back initial investment

    // IRR calculation using Newton-Raphson
    const irr = calculateIRR(totalInvested, cashFlows.slice(0, years), projectedValue - remainingLoan);

    const totalReturn = ((projectedValue - remainingLoan + totalCashFlow) / totalInvested - 1) * 100;
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;

    return {
      years,
      projectedValue,
      totalReturn,
      annualizedReturn,
      equityBuilt,
      totalCashFlow,
      irr,
    };
  }).filter(Boolean) as ReturnMetrics['projections'];

  // Real (inflation-adjusted) cap rate
  const realCapRate = ((1 + capRate / 100) / (1 + inflationRate / 100) - 1) * 100;

  return {
    grossYield,
    netYield,
    capRate,
    cashOnCashReturn,
    paybackYears: paybackYears || 30,
    pricePerSqm,
    rentPerSqm,
    projections,
    realCapRate,
  };
}

// Newton-Raphson IRR calculation
function calculateIRR(
  initialInvestment: number,
  cashFlows: YearlyCashFlow[],
  exitValue: number
): number {
  const flows = [-initialInvestment, ...cashFlows.map((f) => f.cashFlow)];
  // Add exit value to last cash flow
  if (flows.length > 1) {
    flows[flows.length - 1] += exitValue;
  }

  let rate = 0.1; // Initial guess 10%
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      npv += flows[t] / Math.pow(1 + rate, t);
      dnpv -= (t * flows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-8) break;
    rate = newRate;
  }

  return isFinite(rate) ? rate * 100 : 0;
}

export function calculateDealScore(
  metrics: ReturnMetrics,
  country: string,
  cashFlows: YearlyCashFlow[]
): { total: number; breakdown: Record<string, number>; rating: string; recommendation: string } {
  // Country-specific benchmarks (Brazil)
  const yieldBenchmark = country === 'BR' ? 6.0 : 5.0; // Good yield for Brazil
  const cashFlowPositiveThreshold = 0; // Break-even

  // Score yield (0-25)
  let yieldScore = 0;
  if (metrics.netYield >= yieldBenchmark * 1.5) yieldScore = 25;
  else if (metrics.netYield >= yieldBenchmark) yieldScore = 20;
  else if (metrics.netYield >= yieldBenchmark * 0.7) yieldScore = 14;
  else if (metrics.netYield >= yieldBenchmark * 0.5) yieldScore = 8;
  else yieldScore = 3;

  // Score cash flow (0-25)
  const yr1CashFlow = cashFlows[0]?.cashFlow ?? 0;
  let cashFlowScore = 0;
  if (yr1CashFlow > 0) cashFlowScore = 25;
  else if (yr1CashFlow > -500) cashFlowScore = 18;
  else if (yr1CashFlow > -1500) cashFlowScore = 10;
  else cashFlowScore = 3;

  // Score appreciation potential (0-20)
  const yr10 = metrics.projections.find((p) => p.years === 10);
  let appreciationScore = 0;
  if (yr10 && yr10.annualizedReturn >= 15) appreciationScore = 20;
  else if (yr10 && yr10.annualizedReturn >= 10) appreciationScore = 16;
  else if (yr10 && yr10.annualizedReturn >= 7) appreciationScore = 11;
  else appreciationScore = 6;

  // Risk score (0-15) - inverse
  let riskScore = 12; // Default medium risk
  if (metrics.cashOnCashReturn < -5) riskScore = 4;
  if (metrics.paybackYears > 25) riskScore -= 3;

  // Market timing (0-15) - simplified
  const marketScore = 10;

  const total = yieldScore + cashFlowScore + appreciationScore + riskScore + marketScore;

  let rating: string;
  let recommendation: string;
  if (total >= 80) { rating = 'excellent'; recommendation = 'strong-buy'; }
  else if (total >= 65) { rating = 'good'; recommendation = 'buy'; }
  else if (total >= 50) { rating = 'fair'; recommendation = 'hold'; }
  else if (total >= 35) { rating = 'poor'; recommendation = 'pass'; }
  else { rating = 'avoid'; recommendation = 'avoid'; }

  return {
    total,
    breakdown: {
      yield: yieldScore,
      cashFlow: cashFlowScore,
      appreciation: appreciationScore,
      risk: riskScore,
      marketTiming: marketScore,
    },
    rating,
    recommendation,
  };
}
