import { Deal, PurchaseCostBreakdown, AnnualCostBreakdown } from '@/lib/types/deal';
import { US_STATES } from '@/lib/constants/countries';

interface USATaxResult {
  purchase: PurchaseCostBreakdown;
  annual: AnnualCostBreakdown;
  rentalTaxRate: number;
  capitalGainsTaxRate: number;
  rentalTaxExplanation: string;
  notes: string[];
}

// ── Federal income tax brackets 2025 (single filer) ──────────────────────────
// For rental income analysis we use a simplified approach:
// We estimate the marginal rate from annual rental income
function getFederalIncomeTaxRate(annualIncome: number): number {
  if (annualIncome <= 11925) return 10;
  if (annualIncome <= 48475) return 12;
  if (annualIncome <= 103350) return 22;
  if (annualIncome <= 197300) return 24;
  if (annualIncome <= 250525) return 32;
  if (annualIncome <= 626350) return 35;
  return 37;
}

// ── Long-term capital gains rates (federal) ───────────────────────────────────
function getLTCGRate(annualIncome: number): number {
  if (annualIncome <= 47025) return 0;
  if (annualIncome <= 518900) return 15;
  return 20;
}

export function calculateUSATaxes(deal: Deal): USATaxResult {
  const { property, financing, buyerProfile, userOverrides } = deal;
  const price = property.agreedPrice || property.askingPrice;
  const stateConfig = US_STATES[property.state] ?? US_STATES['FL'];
  const isForeignBuyer = buyerProfile.citizenshipStatus === 'foreigner';
  const isCompany = buyerProfile.isCompanyPurchase;

  // ── TRANSFER TAX (deed/recording tax) ────────────────────────────────────
  // Combined state + county transfer tax
  const transferTax = userOverrides.customITBI ?? price * (stateConfig.transferTaxRate / 100);

  // ── TITLE INSURANCE + CLOSING COSTS ──────────────────────────────────────
  // Title insurance: ~0.5-1% of price; required by lenders
  const titleInsurance = price * 0.006;

  // ── ATTORNEY / ESCROW FEES ────────────────────────────────────────────────
  // NY, NJ, MA: attorney required (~$1,500-3,500)
  // CA, TX, FL: escrow/title company handles closing (~$1,000-2,500)
  const legalFees = userOverrides.customRegistrationFee ?? calculateClosingFees(price, property.state);

  // ── BROKER COMMISSION ─────────────────────────────────────────────────────
  // Post-2024 NAR settlement: buyer agent fee now typically negotiated separately
  // We default to 0 for buyer (seller pays listing agent; buyer agent fee varies)
  const brokerCommission = userOverrides.customBrokerFee ?? 0;

  // ── MORTGAGE ORIGINATION FEES ─────────────────────────────────────────────
  let mortgageFee = 0;
  let evaluationFee = 0;
  if (financing.financingType !== 'cash') {
    evaluationFee = 600; // Home appraisal
    mortgageFee = financing.loanAmount * 0.01; // ~1 point origination fee
  }

  const renovationBudget = userOverrides.customRenovation ?? 0;

  const totalTransactionCosts =
    transferTax + titleInsurance + legalFees + brokerCommission + mortgageFee + evaluationFee + renovationBudget;

  const totalCashRequired = financing.downPaymentAmount + totalTransactionCosts;

  // ── ANNUAL PROPERTY TAX ────────────────────────────────────────────────────
  // Property tax varies enormously by state and locality
  // We use state average effective rate * price
  const propertyTaxAnnual = property.iptuAnnual ?? (price * stateConfig.propertyTaxRate / 100);

  // ── HOA / CONDO FEES ──────────────────────────────────────────────────────
  const hoaAnnual = (property.condominiumMonthly ?? estimateHOA(price, property.propertyType)) * 12;

  // ── INSURANCE ─────────────────────────────────────────────────────────────
  // Homeowner's insurance: ~0.5-1.5% of property value/year depending on state
  // FL is much higher due to hurricane; CA due to earthquake/fire
  const insuranceRate = ['FL', 'LA', 'TX'].includes(property.state) ? 0.012 : 0.006;
  const insurance = price * insuranceRate;

  // ── MAINTENANCE ───────────────────────────────────────────────────────────
  const maintenance = price * 0.01; // 1% rule for US investment properties

  const managementFee = deal.rentalAssumptions.ltr.managementFeePercent > 0
    ? (deal.rentalAssumptions.ltr.monthlyRent * 12) * (deal.rentalAssumptions.ltr.managementFeePercent / 100)
    : 0;

  const annualTotal = propertyTaxAnnual + hoaAnnual + insurance + maintenance + managementFee;

  // ── RENTAL INCOME TAX ─────────────────────────────────────────────────────
  // US rental income is taxed as ordinary income (federal + state)
  // Key deductions: mortgage interest, property tax, depreciation (27.5yr), repairs
  // Net taxable rental income = gross rent - deductions
  // We calculate effective rate on gross for simplicity, noting major deductions
  const monthlyRent = deal.rentalAssumptions.ltr.monthlyRent;
  const annualRent = monthlyRent * 12;
  let rentalTaxRate: number;
  let rentalTaxExplanation: string;

  if (isForeignBuyer) {
    // FIRPTA / NRA: 30% withholding on gross rental income (or 15% under treaty)
    // Can elect to treat as ECI (effectively connected income) → taxed at graduated rates
    // Most non-resident investors use ECI election for better rates
    rentalTaxRate = stateConfig.stateTaxRate > 0
      ? 22 + stateConfig.stateTaxRate  // Estimated federal + state for non-resident
      : 22;
    rentalTaxExplanation = 'Non-resident: federal tax on ECI election + state tax. Consider Form W-8ECI to avoid 30% gross withholding.';
  } else if (isCompany) {
    // LLC pass-through: same as personal, but can optimize with depreciation deductions
    // C-Corp: 21% federal corporate tax (rarely used for RE investment)
    rentalTaxRate = getFederalIncomeTaxRate(annualRent) + stateConfig.stateTaxRate;
    rentalTaxExplanation = `LLC pass-through: ${getFederalIncomeTaxRate(annualRent)}% federal + ${stateConfig.stateTaxRate}% ${property.state} state. Depreciation deduction reduces taxable income significantly.`;
  } else {
    const fedRate = getFederalIncomeTaxRate(annualRent);
    rentalTaxRate = fedRate + stateConfig.stateTaxRate;
    rentalTaxExplanation = `Individual: ~${fedRate}% federal + ${stateConfig.stateTaxRate}% ${property.state} state on NET rental income after deductions (depreciation, mortgage interest, property tax, repairs).`;
  }

  // ── CAPITAL GAINS TAX ─────────────────────────────────────────────────────
  // Long-term CGT (held >1 year): 0/15/20% federal + state
  // Section 1250 recapture: 25% on cumulative depreciation taken
  // Primary residence exclusion: $250K single / $500K MFJ
  // FIRPTA withholding for foreign investors: 15% of gross sale price at closing
  const ltcgRate = getLTCGRate(annualRent);
  const capitalGainsTaxRate = isForeignBuyer
    ? 15 + stateConfig.stateTaxRate // FIRPTA + state
    : ltcgRate + stateConfig.stateTaxRate;

  const notes: string[] = [
    `Transfer tax: ${stateConfig.transferTaxRate}% (${property.state || 'FL'} state/county average)`,
    'Mortgage interest deduction available on Schedule E — significantly reduces taxable rental income',
    `Depreciation: deduct 1/27.5 of building value per year (~${(price * 0.8 / 27.5 / 12).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/month) on federal return`,
    isForeignBuyer
      ? '⚠️ FIRPTA: As a foreign person, 15% of gross sale price is withheld at closing. Recover via US tax return. Consult a US CPA familiar with international real estate.'
      : '',
    isForeignBuyer
      ? '📋 File Form W-8ECI to elect rental income as effectively connected — avoids 30% gross withholding.'
      : '',
    isCompany
      ? '💡 LLC (pass-through): protects personal assets, avoids double taxation. Multi-member LLC treated as partnership.'
      : '💡 Many US investors hold property in a single-member LLC for liability protection while keeping pass-through tax treatment.',
    `${property.state} state income tax on rental: ${stateConfig.stateTaxRate === 0 ? 'None ✅' : `${stateConfig.stateTaxRate}%`}`,
    'Annual 1031 Exchange: defer capital gains by reinvesting proceeds into like-kind property within 180 days',
  ].filter(Boolean);

  return {
    purchase: {
      propertyPrice: price,
      itbi: transferTax,         // reuse itbi field for transfer tax
      registrationFee: legalFees + titleInsurance,
      brokerCommission,
      legalFees: 0,
      mortgageArrangementFee: mortgageFee,
      evaluationFee,
      renovationBudget,
      furnitureBudget: 0,
      otherCosts: 0,
      totalTransactionCosts,
      totalCashRequired,
    },
    annual: {
      iptu: propertyTaxAnnual,   // reuse iptu field for property tax
      condominium: hoaAnnual,    // reuse condominium field for HOA
      insurance,
      maintenance,
      managementFee,
      total: annualTotal,
    },
    rentalTaxRate,
    capitalGainsTaxRate,
    rentalTaxExplanation,
    notes,
  };
}

function calculateClosingFees(price: number, state: string): number {
  // NY/NJ need attorney; others use escrow
  const needsAttorney = ['NY', 'NJ', 'MA', 'CT', 'SC', 'GA'].includes(state);
  const base = needsAttorney ? 2500 : 1500;
  if (price > 2_000_000) return base + 1500;
  if (price > 1_000_000) return base + 1000;
  return base;
}

function estimateHOA(price: number, type: string): number {
  if (type === 'house' || type === 'land') return 0;
  // US condos/apartments: $200-600/month typical
  // Rough proxy: 0.3-0.4% of property value / year / 12
  return (price * 0.0035) / 12;
}

export function getUSARentalTaxRate(monthlyRent: number, state: string, isForeigner = false): number {
  const stateConfig = US_STATES[state] ?? US_STATES['FL'];
  if (isForeigner) return 22 + stateConfig.stateTaxRate;
  return getFederalIncomeTaxRate(monthlyRent * 12) + stateConfig.stateTaxRate;
}

export function calculateUSARentalTax(monthlyRent: number, state: string, isForeigner = false, isCompany = false): number {
  // Approximate — actual depends on deductions (depreciation significantly reduces taxable income)
  // We return a conservative estimate before deductions, flag for user
  const annualGross = monthlyRent * 12;
  const stateConfig = US_STATES[state] ?? US_STATES['FL'];

  if (isForeigner) {
    // ECI election: taxed at graduated rates on net income
    // Assume ~30% deductions (depreciation + interest)
    const netIncome = annualGross * 0.7;
    return netIncome * (getFederalIncomeTaxRate(netIncome) + stateConfig.stateTaxRate) / 100;
  }

  // Estimate: effective rate on net income after ~40% deductions
  // (depreciation ~20% + mortgage interest ~10% + other ~10%)
  const netIncome = annualGross * 0.6;
  const effectiveRate = (getFederalIncomeTaxRate(netIncome) + stateConfig.stateTaxRate) / 100;
  return netIncome * effectiveRate;
}
