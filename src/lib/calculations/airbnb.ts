import { Deal, RentalAnalysis } from '@/lib/types/deal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Default seasonality profiles by Brazilian city
const BRAZIL_SEASONALITY: Record<string, number[]> = {
  // São Paulo: relatively flat, slight Dec-Jan peak
  SP: [1.1, 1.0, 1.0, 0.9, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.05, 1.1],
  // Rio de Janeiro: strong Jan-Mar (Carnaval), Dec peak
  RJ: [1.4, 1.5, 1.3, 0.9, 0.85, 0.85, 0.9, 0.9, 0.95, 1.0, 1.1, 1.4],
  // Florianópolis: strong Dec-Mar (summer beach)
  SC: [1.6, 1.5, 1.3, 0.8, 0.7, 0.65, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5],
  // Fortaleza/CE: relatively flat, slight Jul-Aug high (holiday season Brazil)
  CE: [1.1, 1.0, 0.95, 0.9, 0.9, 0.95, 1.15, 1.15, 1.0, 1.0, 1.05, 1.15],
  // Bahia/Salvador: Carnaval (Feb) + Jul
  BA: [1.2, 1.6, 1.2, 0.9, 0.85, 0.9, 1.2, 1.1, 0.95, 1.0, 1.05, 1.2],
  // Default
  DEFAULT: [1.1, 1.1, 1.0, 0.9, 0.85, 0.85, 0.95, 0.95, 0.95, 1.0, 1.05, 1.1],
};

function getSeasonality(state: string): number[] {
  return BRAZIL_SEASONALITY[state] || BRAZIL_SEASONALITY['DEFAULT'];
}

function getDaysInMonth(monthIndex: number): number {
  // Use a non-leap year for simplicity
  return new Date(2025, monthIndex + 1, 0).getDate();
}

export function calculateRentalAnalysis(deal: Deal, annualRentalTax: number): RentalAnalysis {
  const { rentalAssumptions, property, buyerProfile } = deal;
  const { ltr, str } = rentalAssumptions;

  const price = property.agreedPrice || property.askingPrice;

  // ── LONG-TERM RENTAL ──────────────────────────────────────────────────────
  const grossAnnualLTR = ltr.monthlyRent * 12;
  const vacancyLoss = grossAnnualLTR * (ltr.vacancyRatePercent / 100);
  const effectiveLTR = grossAnnualLTR - vacancyLoss;

  const ltrOperatingCosts =
    effectiveLTR * (ltr.managementFeePercent / 100) +
    price * (ltr.maintenancePercent / 100) +
    ltr.insurance;

  const netAnnualLTR = effectiveLTR - ltrOperatingCosts;
  const grossYieldLTR = (grossAnnualLTR / price) * 100;
  const netYieldLTR = (netAnnualLTR / price) * 100;

  // Rental income tax on LTR
  const taxOnLTR = annualRentalTax;

  // ── SHORT-TERM RENTAL (AIRBNB) ────────────────────────────────────────────
  const seasonality = str.monthlyMultipliers.length === 12
    ? str.monthlyMultipliers
    : getSeasonality(property.state);

  // Monthly revenue calculation
  const monthlyBreakdown = seasonality.map((multiplier, i) => {
    const days = getDaysInMonth(i);
    const occupancy = Math.min((str.occupancyRatePercent / 100) * multiplier, 1.0);
    const nightsOccupied = days * occupancy;
    const revenue = nightsOccupied * str.avgNightlyRate;

    // Number of stays estimate (avg 3 nights per stay)
    const stays = Math.round(nightsOccupied / 3);
    const cleaningRevenue = stays * str.cleaningFeePerStay;

    return {
      month: MONTH_NAMES[i],
      income: revenue + cleaningRevenue,
      occupancy: occupancy * 100,
      nights: nightsOccupied,
    };
  });

  const grossAnnualSTR = monthlyBreakdown.reduce((sum, m) => sum + m.income, 0);

  // STR operating costs
  const airbnbCommission = grossAnnualSTR * (str.platformCommissionPercent / 100);
  const managementFeeSTR = grossAnnualSTR * (str.managementFeePercent / 100);
  const cleaningTotal = monthlyBreakdown.reduce((sum, m) => {
    const stays = Math.round(m.nights / 3);
    return sum + stays * str.cleaningFeePerStay;
  }, 0);
  const utilitiesAnnual = str.utilitiesMontly * 12;
  const maintenanceSTR = price * (str.maintenancePercent / 100);
  const insuranceSTR = str.insurance;

  const totalSTRCosts =
    airbnbCommission + managementFeeSTR + maintenanceSTR + insuranceSTR + utilitiesAnnual;

  const netAnnualSTR = grossAnnualSTR - totalSTRCosts;
  const grossYieldSTR = (grossAnnualSTR / price) * 100;
  const netYieldSTR = (netAnnualSTR / price) * 100;

  // Break-even occupancy for STR vs LTR
  const variableCostPerNight = str.platformCommissionPercent / 100 * str.avgNightlyRate +
    str.cleaningFeePerStay / 3; // cleaning amortized over avg stay
  const fixedSTRCosts = maintenanceSTR + insuranceSTR + utilitiesAnnual;
  const breakEvenOccupancySTR =
    ((netAnnualLTR + fixedSTRCosts) / (str.avgNightlyRate * 365 - variableCostPerNight * 365)) * 100;

  // Tax on STR income (Brazil treats STR as rental income, same rates)
  const taxOnSTR = grossAnnualSTR * (annualRentalTax / Math.max(grossAnnualLTR, 1));

  // Peak and low month
  const peakMonth = monthlyBreakdown.reduce((max, m) => (m.income > max.income ? m : max));
  const lowMonth = monthlyBreakdown.reduce((min, m) => (m.income < min.income ? m : min));

  // Recommendation
  const strPremium = netAnnualLTR > 0
    ? ((netAnnualSTR - netAnnualLTR) / Math.abs(netAnnualLTR)) * 100
    : 0;

  let recommendedStrategy: 'long-term' | 'short-term' | 'hybrid' | 'none' = 'long-term';
  if (str.avgNightlyRate > 0) {
    if (strPremium > 40) recommendedStrategy = 'short-term';
    else if (strPremium > 15) recommendedStrategy = 'hybrid';
  }

  return {
    ltr: {
      grossAnnualIncome: grossAnnualLTR,
      netAnnualIncome: netAnnualLTR,
      grossYield: grossYieldLTR,
      netYield: netYieldLTR,
      monthlyNetIncome: netAnnualLTR / 12,
      vacancyLoss,
      taxOnRent: taxOnLTR,
    },
    str: {
      grossAnnualRevenue: grossAnnualSTR,
      netAnnualIncome: netAnnualSTR,
      grossYield: grossYieldSTR,
      netYield: netYieldSTR,
      monthlyAvgIncome: netAnnualSTR / 12,
      occupancyRate: str.occupancyRatePercent,
      avgNightlyRate: str.avgNightlyRate,
      peakMonthRevenue: peakMonth.income,
      lowMonthRevenue: lowMonth.income,
      breakEvenOccupancy: Math.max(0, breakEvenOccupancySTR),
      taxOnIncome: taxOnSTR,
      monthlyBreakdown,
    },
    recommendedStrategy,
    strPremiumPercent: strPremium,
  };
}

// Estimate Airbnb potential from property data
export function estimateAirbnbPotential(
  city: string,
  state: string,
  sizeSqm: number,
  rooms: number,
  condition: string
): { avgNightlyRate: number; occupancyRate: number; monthlyRevenue: number } {
  // Brazilian Airbnb market estimates by state (2024 data)
  const BASE_RATES: Record<string, number> = {
    SP: 250, // São Paulo
    RJ: 320, // Rio de Janeiro
    SC: 280, // Santa Catarina / Florianópolis
    CE: 200, // Fortaleza
    BA: 220, // Salvador / Bahia
    PE: 190, // Recife
    GO: 160, // Goiás
    PR: 180, // Curitiba
    RS: 170, // Porto Alegre
    DF: 210, // Brasília
    DEFAULT: 180,
  };

  const BASE_OCCUPANCY: Record<string, number> = {
    SP: 62, RJ: 68, SC: 70, CE: 65, BA: 63, PE: 60,
    GO: 55, PR: 58, RS: 57, DF: 60, DEFAULT: 58,
  };

  let baseRate = BASE_RATES[state] || BASE_RATES['DEFAULT'];
  let baseOccupancy = BASE_OCCUPANCY[state] || BASE_OCCUPANCY['DEFAULT'];

  // Adjust for size
  if (sizeSqm > 100) baseRate *= 1.3;
  else if (sizeSqm > 70) baseRate *= 1.15;
  else if (sizeSqm < 35) baseRate *= 0.75;

  // Adjust for rooms
  baseRate *= 0.7 + rooms * 0.15;

  // Adjust for condition
  if (condition === 'new' || condition === 'excellent') baseRate *= 1.2;
  else if (condition === 'needs-work' || condition === 'renovation') baseRate *= 0.7;

  const monthlyRevenue = (baseRate * 30 * baseOccupancy) / 100;

  return {
    avgNightlyRate: Math.round(baseRate),
    occupancyRate: baseOccupancy,
    monthlyRevenue: Math.round(monthlyRevenue),
  };
}
