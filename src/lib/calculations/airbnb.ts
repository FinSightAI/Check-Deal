import { Deal, RentalAnalysis } from '@/lib/types/deal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Default seasonality profiles by Brazilian state
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

// Israeli STR seasonality profiles by city
// Key drivers: summer (Jul-Aug) domestic tourism, Jewish holidays (Sep-Oct: Rosh Hashana/Sukkot),
// Passover (Apr), winter holidays (Dec for Eilat), low in Nov & Jan-Feb
const ISRAEL_SEASONALITY: Record<string, number[]> = {
  // Tel Aviv: year-round, summer + Passover peak
  'tel aviv': [0.9, 0.9, 1.0, 1.2, 1.0, 1.1, 1.3, 1.3, 1.15, 1.1, 0.85, 0.95],
  'תל אביב': [0.9, 0.9, 1.0, 1.2, 1.0, 1.1, 1.3, 1.3, 1.15, 1.1, 0.85, 0.95],
  // Jerusalem: strong Passover + Jewish holidays + Christian Christmas
  'jerusalem': [0.95, 0.9, 1.05, 1.3, 1.0, 1.05, 1.2, 1.2, 1.2, 1.15, 0.85, 1.1],
  'ירושלים': [0.95, 0.9, 1.05, 1.3, 1.0, 1.05, 1.2, 1.2, 1.2, 1.15, 0.85, 1.1],
  // Eilat: peak Dec-Mar (winter sun), lower in Jun-Sep (extreme heat)
  'eilat': [1.3, 1.2, 1.1, 1.1, 0.9, 0.8, 0.85, 0.85, 0.95, 1.1, 1.1, 1.35],
  'אילת': [1.3, 1.2, 1.1, 1.1, 0.9, 0.8, 0.85, 0.85, 0.95, 1.1, 1.1, 1.35],
  // Haifa: moderate, summer + Jewish holidays
  'haifa': [0.9, 0.9, 1.0, 1.15, 1.0, 1.05, 1.2, 1.25, 1.15, 1.1, 0.85, 0.9],
  'חיפה': [0.9, 0.9, 1.0, 1.15, 1.0, 1.05, 1.2, 1.25, 1.15, 1.1, 0.85, 0.9],
  // Herzliya / coastal: beach summer peak
  'herzliya': [0.85, 0.85, 1.0, 1.1, 1.05, 1.15, 1.35, 1.35, 1.1, 1.05, 0.85, 0.9],
  'הרצליה': [0.85, 0.85, 1.0, 1.1, 1.05, 1.15, 1.35, 1.35, 1.1, 1.05, 0.85, 0.9],
  // Default Israel
  IL_DEFAULT: [0.9, 0.9, 1.0, 1.2, 1.0, 1.05, 1.25, 1.25, 1.15, 1.1, 0.85, 0.95],
};

function getIsraelSeasonality(city: string): number[] {
  const cityLower = city.toLowerCase();
  for (const [key, profile] of Object.entries(ISRAEL_SEASONALITY)) {
    if (key === 'IL_DEFAULT') continue;
    if (cityLower.includes(key)) return profile;
  }
  return ISRAEL_SEASONALITY['IL_DEFAULT'];
}

// US STR seasonality profiles by state
// Key drivers: summer beach (FL/SC/NC), ski season (CO/UT), year-round (HI/FL), shoulder (TX/GA)
const USA_SEASONALITY: Record<string, number[]> = {
  // Florida: peak Dec-Apr (snowbirds), hot but ok summer
  FL: [1.3, 1.2, 1.2, 1.1, 0.95, 0.85, 0.85, 0.85, 0.9, 1.0, 1.1, 1.3],
  // New York: summer + fall foliage, Christmas week spike
  NY: [0.8, 0.85, 0.95, 1.0, 1.1, 1.1, 1.2, 1.2, 1.15, 1.05, 0.85, 1.0],
  // California: year-round, summer peak
  CA: [0.9, 0.9, 1.0, 1.05, 1.1, 1.2, 1.3, 1.25, 1.1, 1.0, 0.9, 0.9],
  // Texas: spring + fall, hot summer depresses tourist season
  TX: [0.9, 0.95, 1.1, 1.15, 1.0, 0.9, 0.85, 0.85, 1.0, 1.1, 1.0, 0.95],
  // Colorado: ski Dec-Mar, summer hiking Jun-Aug. Two peaks.
  CO: [1.1, 1.1, 1.0, 0.85, 0.9, 1.0, 1.3, 1.25, 1.0, 0.9, 0.85, 1.15],
  // Hawaii: year-round tourism, slight peak Dec-Mar and summer
  HI: [1.2, 1.1, 1.1, 1.0, 1.0, 1.1, 1.15, 1.1, 1.0, 0.95, 0.95, 1.15],
  // Tennessee (Nashville, Gatlinburg): spring, summer, fall colors
  TN: [0.85, 0.9, 1.05, 1.15, 1.1, 1.1, 1.2, 1.15, 1.1, 1.1, 0.85, 0.9],
  // Arizona (Scottsdale/Sedona): peak Oct-Apr, slow summer (extreme heat)
  AZ: [1.2, 1.2, 1.2, 1.1, 0.9, 0.7, 0.65, 0.7, 0.9, 1.1, 1.15, 1.2],
  // Georgia (Atlanta/Savannah): spring + fall, Christmas
  GA: [0.9, 0.9, 1.05, 1.15, 1.1, 1.05, 1.1, 1.1, 1.05, 1.05, 0.9, 1.0],
  // North Carolina (Asheville/OBX): summer + fall, ski winter
  NC: [0.85, 0.85, 0.95, 1.1, 1.15, 1.15, 1.25, 1.25, 1.15, 1.1, 0.85, 0.85],
  // Default US
  US_DEFAULT: [0.9, 0.9, 1.0, 1.05, 1.05, 1.1, 1.2, 1.15, 1.05, 1.0, 0.9, 1.0],
};

function getUSASeasonality(state: string): number[] {
  return USA_SEASONALITY[state] || USA_SEASONALITY['US_DEFAULT'];
}

function getSeasonality(state: string, country?: string, city?: string): number[] {
  if (country === 'IL') return getIsraelSeasonality(city ?? '');
  if (country === 'US') return getUSASeasonality(state);
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
    : getSeasonality(property.state, property.country, property.city);

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
  condition: string,
  country?: string
): { avgNightlyRate: number; occupancyRate: number; monthlyRevenue: number } {
  // Israeli Airbnb market estimates by city (₪ nightly rates, 2025 data)
  if (country === 'IL') {
    const IL_RATES: Record<string, number> = {
      'tel aviv': 650, 'תל אביב': 650,
      'jerusalem': 550, 'ירושלים': 550,
      'eilat': 500, 'אילת': 500,
      'herzliya': 580, 'הרצליה': 580,
      'haifa': 420, 'חיפה': 420,
      'netanya': 450, 'נתניה': 450,
      'raanana': 400, 'רעננה': 400,
      'rishon lezion': 380, 'ראשון לציון': 380,
      'beer sheva': 300, 'באר שבע': 300,
    };
    const IL_OCCUPANCY: Record<string, number> = {
      'tel aviv': 72, 'תל אביב': 72,
      'jerusalem': 68, 'ירושלים': 68,
      'eilat': 65, 'אילת': 65,
      'herzliya': 68, 'הרצליה': 68,
      'haifa': 60, 'חיפה': 60,
    };
    const cityLower = city.toLowerCase();
    let baseRate = 380; // default ₪/night
    let baseOccupancy = 62;
    for (const [key, rate] of Object.entries(IL_RATES)) {
      if (cityLower.includes(key)) { baseRate = rate; break; }
    }
    for (const [key, occ] of Object.entries(IL_OCCUPANCY)) {
      if (cityLower.includes(key)) { baseOccupancy = occ; break; }
    }
    if (sizeSqm > 100) baseRate *= 1.3;
    else if (sizeSqm > 70) baseRate *= 1.15;
    else if (sizeSqm < 35) baseRate *= 0.75;
    baseRate *= 0.7 + rooms * 0.15;
    if (condition === 'new' || condition === 'excellent') baseRate *= 1.2;
    else if (condition === 'needs-work' || condition === 'renovation') baseRate *= 0.7;
    const monthlyRevenue = (baseRate * 30 * baseOccupancy) / 100;
    return {
      avgNightlyRate: Math.round(baseRate),
      occupancyRate: baseOccupancy,
      monthlyRevenue: Math.round(monthlyRevenue),
    };
  }

  // US Airbnb market estimates by city/state (USD nightly rates, 2025 data)
  if (country === 'US') {
    const US_CITY_RATES: Record<string, number> = {
      'miami': 250, 'miami beach': 280, 'south beach': 290,
      'orlando': 180, 'kissimmee': 160,
      'nashville': 220, 'new york': 280, 'brooklyn': 200,
      'los angeles': 230, 'santa monica': 260, 'hollywood': 220,
      'san francisco': 200, 'san diego': 210,
      'austin': 175, 'dallas': 150, 'houston': 140,
      'denver': 185, 'vail': 320, 'breckenridge': 300, 'aspen': 450,
      'scottsdale': 210, 'sedona': 280, 'phoenix': 160,
      'savannah': 200, 'charleston': 220,
      'asheville': 220, 'gatlinburg': 240,
      'honolulu': 240, 'maui': 350, 'kauai': 320,
      'chicago': 160, 'boston': 175,
      'seattle': 170, 'portland': 150,
      'las vegas': 180,
    };
    const US_CITY_OCCUPANCY: Record<string, number> = {
      'miami': 72, 'miami beach': 75, 'south beach': 75,
      'orlando': 70, 'kissimmee': 68,
      'nashville': 68, 'new york': 72, 'brooklyn': 68,
      'los angeles': 70, 'santa monica': 72,
      'san francisco': 65, 'san diego': 72,
      'austin': 65, 'dallas': 60, 'houston': 58,
      'denver': 64, 'vail': 62, 'breckenridge': 60, 'aspen': 65,
      'scottsdale': 67, 'sedona': 68, 'phoenix': 62,
      'savannah': 66, 'charleston': 68,
      'asheville': 68, 'gatlinburg': 72,
      'honolulu': 72, 'maui': 75, 'kauai': 73,
    };
    const US_STATE_RATES: Record<string, number> = {
      FL: 190, NY: 175, CA: 195, TX: 145, CO: 185, HI: 260,
      TN: 175, AZ: 175, GA: 155, NC: 170, SC: 175, NV: 165,
      IL: 150, MA: 165, WA: 155, OR: 145, DEFAULT: 155,
    };
    const US_STATE_OCCUPANCY: Record<string, number> = {
      FL: 70, NY: 68, CA: 68, TX: 60, CO: 62, HI: 73,
      TN: 67, AZ: 65, GA: 62, NC: 65, SC: 67, NV: 65,
      IL: 60, MA: 63, WA: 62, OR: 60, DEFAULT: 60,
    };

    const cityLower = city.toLowerCase();
    let baseRate = US_STATE_RATES[state] || US_STATE_RATES['DEFAULT'];
    let baseOccupancy = US_STATE_OCCUPANCY[state] || US_STATE_OCCUPANCY['DEFAULT'];

    for (const [key, rate] of Object.entries(US_CITY_RATES)) {
      if (cityLower.includes(key)) { baseRate = rate; break; }
    }
    for (const [key, occ] of Object.entries(US_CITY_OCCUPANCY)) {
      if (cityLower.includes(key)) { baseOccupancy = occ; break; }
    }

    if (sizeSqm > 100) baseRate *= 1.3;
    else if (sizeSqm > 70) baseRate *= 1.15;
    else if (sizeSqm < 35) baseRate *= 0.75;
    baseRate *= 0.7 + rooms * 0.15;
    if (condition === 'new' || condition === 'excellent') baseRate *= 1.2;
    else if (condition === 'needs-work' || condition === 'renovation') baseRate *= 0.7;

    const monthlyRevenue = (baseRate * 30 * baseOccupancy) / 100;
    return {
      avgNightlyRate: Math.round(baseRate),
      occupancyRate: baseOccupancy,
      monthlyRevenue: Math.round(monthlyRevenue),
    };
  }

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
