import { Deal, PurchaseCostBreakdown, AnnualCostBreakdown } from '@/lib/types/deal';

interface IsraelTaxResult {
  purchase: PurchaseCostBreakdown;
  annual: AnnualCostBreakdown;
  rentalTaxRate: number;
  capitalGainsTaxRate: number;
  rentalTaxExplanation: string;
  notes: string[];
}

// ── MAS RECHISHA BRACKETS (2025) ─────────────────────────────────────────────
// First home / Israeli resident buying first property
const FIRST_HOME_BRACKETS = [
  { upTo: 1978745, rate: 0 },
  { upTo: 2347040, rate: 0.035 },
  { upTo: 6055070, rate: 0.05 },
  { upTo: 20183565, rate: 0.08 },
  { upTo: Infinity, rate: 0.10 },
];

// Investment / second property / foreigner
const INVESTMENT_BRACKETS = [
  { upTo: 5872725, rate: 0.08 },
  { upTo: Infinity, rate: 0.10 },
];

function calculateMasRechisha(price: number, isFirstHome: boolean): number {
  const brackets = isFirstHome ? FIRST_HOME_BRACKETS : INVESTMENT_BRACKETS;
  let tax = 0;
  let prev = 0;

  for (const bracket of brackets) {
    if (price <= prev) break;
    const taxable = Math.min(price, bracket.upTo) - prev;
    tax += taxable * bracket.rate;
    prev = bracket.upTo;
  }

  return Math.round(tax);
}

// ── ARNONA ESTIMATES BY CITY (₪/sqm/year for residential) ────────────────────
const ARNONA_BY_CITY: Record<string, number> = {
  'tel aviv': 95,
  'תל אביב': 95,
  'ramat gan': 75,
  'רמת גן': 75,
  'herzliya': 70,
  'הרצליה': 70,
  'raanana': 65,
  "ra'anana": 65,
  'רעננה': 65,
  'kfar saba': 55,
  'כפר סבא': 55,
  'petah tikva': 55,
  'פתח תקווה': 55,
  'rishon lezion': 55,
  'ראשון לציון': 55,
  'jerusalem': 70,
  'ירושלים': 70,
  'haifa': 60,
  'חיפה': 60,
  'netanya': 55,
  'נתניה': 55,
  'ashdod': 50,
  'אשדוד': 50,
  'beer sheva': 35,
  "be'er sheva": 35,
  'באר שבע': 35,
  'eilat': 45,
  'אילת': 45,
  'modiin': 60,
  'מודיעין': 60,
};

function estimateArnona(city: string, sqm: number): number {
  const cityLower = city.toLowerCase();
  let ratePerSqm = 60; // default

  for (const [key, rate] of Object.entries(ARNONA_BY_CITY)) {
    if (cityLower.includes(key)) {
      ratePerSqm = rate;
      break;
    }
  }

  return Math.round(sqm * ratePerSqm);
}

// ── VAAD BAYIT ESTIMATE ───────────────────────────────────────────────────────
function estimateVaadBayit(price: number, propertyType: string, sqm: number): number {
  if (propertyType === 'house' || propertyType === 'land') return 0;
  // ₪300-700/month for typical apartment
  // Roughly proportional to size and value
  const monthlyRate = Math.min(Math.max(sqm * 3.5, 300), 800);
  return Math.round(monthlyRate) * 12;
}

// ── RENTAL TAX (Israel) ───────────────────────────────────────────────────────
// Track 1 (פטור חלקי): Up to ₪5,471/month exempt. Excess taxed at marginal rates.
//   Not available for foreigners / companies.
// Track 2 (10% מס מופחת): 10% flat on ALL rental income, no deductions
// Track 3 (שיעור שולי): full deductions (depreciation 2%/yr, mortgage interest, arnona)
//   taxed at regular marginal rates 10-47%

const EXEMPT_THRESHOLD_MONTHLY = 5471; // ₪5,471/month (2025)

export function getIsraelRentalTaxRate(
  monthlyRent: number,
  isForeigner: boolean,
  isCompany: boolean
): { rate: number; track: string; explanation: string } {
  if (isCompany) {
    return {
      rate: 23,
      track: 'corporate',
      explanation: 'Corporate tax (misim hachnasa): 23% + dividend withholding on distribution',
    };
  }

  if (isForeigner) {
    // Foreigners can use Track 2 (10%) or marginal rate
    // Track 2 is almost always better for foreigners
    return {
      rate: 10,
      track: '2',
      explanation: 'Track 2: 10% flat rate on gross rental income (no deductions) — optimal for non-residents',
    };
  }

  const annualRent = monthlyRent * 12;

  // Track 1: exempt portion up to ₪5,471/month
  if (monthlyRent <= EXEMPT_THRESHOLD_MONTHLY) {
    return {
      rate: 0,
      track: '1',
      explanation: `Track 1 (exempt): Monthly rent ₪${monthlyRent.toLocaleString()} is below the ₪${EXEMPT_THRESHOLD_MONTHLY.toLocaleString()} threshold — fully tax-exempt`,
    };
  }

  // Above threshold: Track 1 vs Track 2 comparison
  // Track 2 is 10% on everything but Track 1 taxes only the excess at marginal rates
  // For simplicity, recommend Track 2 for most investors (above threshold)
  if (annualRent <= 250000) {
    return {
      rate: 10,
      track: '2',
      explanation: `Track 2: 10% flat rate on all rental income. Rent exceeds ₪${EXEMPT_THRESHOLD_MONTHLY.toLocaleString()}/month exempt threshold.`,
    };
  }

  // High rental income → Track 3 with deductions may be better
  return {
    rate: 25, // approximate effective marginal rate after deductions
    track: '3',
    explanation: 'Track 3 (marginal rate with full deductions): recommended for high-income situations. Consult an accountant.',
  };
}

export function calculateIsraelTaxes(deal: Deal): IsraelTaxResult {
  const { property, financing, buyerProfile, userOverrides } = deal;
  const price = property.agreedPrice || property.askingPrice;

  // Detect if this is a first-home purchase for Israeli residents
  const isFirstHome =
    buyerProfile.isFirstHomeBuyer &&
    buyerProfile.citizenshipStatus !== 'foreigner' &&
    (deal.buyerProfile.existingPropertiesInBrazil + deal.buyerProfile.existingPropertiesAbroad) === 0;

  const isForeigner = buyerProfile.citizenshipStatus === 'foreigner';

  // ── MAS RECHISHA (מס רכישה) ────────────────────────────────────────────────
  const masRechisha = userOverrides.customITBI ?? calculateMasRechisha(price, isFirstHome);

  // ── TABU REGISTRATION (טאבו) ──────────────────────────────────────────────
  // Fixed registration fee at Land Registry
  const tabuFee = 750; // approximately ₪750 flat fee

  // ── LAWYER FEES (שכר טרחת עורך דין) ──────────────────────────────────────
  // 0.5-1% of property value + 17% VAT
  // Minimum ~₪5,000
  const lawyerFeeBase = Math.max(5000, price * 0.0075);
  const lawyerFeeWithVAT = lawyerFeeBase * 1.17;
  const legalFees = userOverrides.customRegistrationFee ?? Math.round(lawyerFeeWithVAT);

  // ── REAL ESTATE AGENT (מתווך) ────────────────────────────────────────────
  // In Israel, buyer typically pays 2% + 17% VAT = 2.34%
  const brokerCommission = userOverrides.customBrokerFee ?? 0;
  // Note: default 0 — user opts in if they used an agent

  // ── MORTGAGE FEES (if financed) ──────────────────────────────────────────
  let mortgageFee = 0;
  let evaluationFee = 0;
  if (financing.financingType !== 'cash') {
    evaluationFee = 2500; // Bank appraisal (שמאות בנקאית) ₪2,000-3,000
    mortgageFee = 2000; // Bank arrangement fee (דמי טיפול) ₪1,500-3,000
  }

  const renovationBudget = userOverrides.customRenovation ?? 0;

  const totalTransactionCosts =
    masRechisha + tabuFee + legalFees + brokerCommission + mortgageFee + evaluationFee + renovationBudget;

  const totalCashRequired = financing.downPaymentAmount + totalTransactionCosts;

  // ── ANNUAL COSTS ─────────────────────────────────────────────────────────

  // Arnona (ארנונה) — annual municipal property tax
  const arnonaAnnual =
    (property.marketSpecific?.arnona ?? 0) > 0
      ? (property.marketSpecific!.arnona! * 12)
      : estimateArnona(property.city, property.sizeSqm);

  // Vaad Bayit (ועד בית) — building maintenance
  const vaadBayitAnnual =
    (property.marketSpecific?.vaadBayit ?? 0) > 0
      ? (property.marketSpecific!.vaadBayit! * 12)
      : estimateVaadBayit(price, property.propertyType, property.sizeSqm);

  // Insurance (ביטוח דירה)
  const insurance = Math.max(1200, price * 0.001); // ~0.1% annually

  // Maintenance
  const maintenance = price * 0.005; // 0.5% of property value/year

  const managementFee =
    deal.rentalAssumptions.ltr.managementFeePercent > 0
      ? deal.rentalAssumptions.ltr.monthlyRent *
        12 *
        (deal.rentalAssumptions.ltr.managementFeePercent / 100)
      : 0;

  const annualTotal = arnonaAnnual + vaadBayitAnnual + insurance + maintenance + managementFee;

  // ── RENTAL INCOME TAX ────────────────────────────────────────────────────
  const monthlyRent = deal.rentalAssumptions.ltr.monthlyRent;
  const taxInfo = getIsraelRentalTaxRate(monthlyRent, isForeigner, buyerProfile.isCompanyPurchase);

  // ── CAPITAL GAINS (MAS SHEVACH — מס שבח) ─────────────────────────────────
  // Standard residential: 25% on nominal gain
  // Primary residence sold after 18+ months owner-occupation: exempt
  // Improvement levy (היטל השבחה): may apply, paid by seller
  const capitalGainsTaxRate = deal.property.purchaseStrategy === 'primary-residence' ? 0 : 25;

  const notes: string[] = [
    isFirstHome
      ? `✅ First home purchase: Mas Rechisha exemption applies up to ₪1,978,745 (0% bracket)`
      : `⚠️ Investment/second property: Mas Rechisha 8% up to ₪5,872,725 (₪${masRechisha.toLocaleString()})`
    ,
    'Lawyer fees include 17% VAT (mam). Total ≈ 0.75-1% of property value.',
    isForeigner
      ? '🌍 As a non-resident foreigner: Mas Rechisha 8%+, no Track 1 rental tax exemption, max 70% LTV for mortgage.'
      : '',
    buyerProfile.taxResidency === 'IL'
      ? '🇮🇱 Israeli tax resident: must report property purchase to ITA within 30 days. Rental income taxable in Israel.'
      : '',
    `💡 Rental tax Track 2 (10% flat): simple, no deductions. Track 3 (marginal with deductions): better if high expenses/depreciation.`,
    `📊 Capital gains on sale: 25% Mas Shevach. Primary residence exempt after 18 months.`,
  ].filter(Boolean);

  return {
    purchase: {
      propertyPrice: price,
      itbi: masRechisha, // reusing 'itbi' field for transfer tax (Mas Rechisha)
      registrationFee: tabuFee + legalFees,
      brokerCommission,
      legalFees,
      mortgageArrangementFee: mortgageFee,
      evaluationFee,
      renovationBudget,
      furnitureBudget: 0,
      otherCosts: 0,
      totalTransactionCosts,
      totalCashRequired,
    },
    annual: {
      iptu: arnonaAnnual, // reusing 'iptu' field for Arnona
      condominium: vaadBayitAnnual, // reusing for Vaad Bayit
      insurance,
      maintenance,
      managementFee,
      total: annualTotal,
    },
    rentalTaxRate: taxInfo.rate,
    capitalGainsTaxRate,
    rentalTaxExplanation: taxInfo.explanation,
    notes,
  };
}

// Annual rental tax calculation (Israel)
export function calculateIsraelRentalTax(
  monthlyRent: number,
  isForeigner: boolean,
  isCompany: boolean
): number {
  const { rate, track } = getIsraelRentalTaxRate(monthlyRent, isForeigner, isCompany);
  const annualRent = monthlyRent * 12;

  if (track === '1') return 0; // exempt

  if (track === '2' || isForeigner) {
    return annualRent * (rate / 100);
  }

  // Track 3 — rough estimate (actual depends on deductions)
  return annualRent * (rate / 100);
}
