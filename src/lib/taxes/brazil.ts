import { Deal, PurchaseCostBreakdown, AnnualCostBreakdown } from '@/lib/types/deal';
import { BR_STATES } from '@/lib/constants/countries';

interface BrazilTaxResult {
  purchase: PurchaseCostBreakdown;
  annual: AnnualCostBreakdown;
  rentalTaxRate: number; // Effective tax rate on rental income
  capitalGainsTaxRate: number;
  rentalTaxExplanation: string;
  notes: string[];
}

export function calculateBrazilTaxes(deal: Deal): BrazilTaxResult {
  const { property, financing, buyerProfile, userOverrides } = deal;
  const price = property.agreedPrice || property.askingPrice;
  const stateConfig = BR_STATES[property.state] || BR_STATES['SP'];

  // ── ITBI (Imposto de Transmissão de Bens Imóveis) ──────────────────────────
  // Typically 2-3% of purchase price, varies by municipality
  // Some cities calculate on "valor venal" (assessed value) if higher
  let itbiRate = stateConfig.itbiRate / 100;

  // Foreign buyers pay same rate as citizens (Brazil doesn't penalize foreigners on ITBI)
  // Minha Casa Minha Vida: reduced ITBI in some municipalities
  if (financing.financedByMCMV) {
    itbiRate = Math.min(itbiRate, 0.005); // Some MCMV programs exempt or reduce ITBI
  }

  const itbi = userOverrides.customITBI ?? price * itbiRate;

  // ── Registration Fee (Cartório / Registro de Imóveis) ─────────────────────
  // Varies by state, approx 0.5-1% of property value
  // Notary + registration typically R$2,000 - R$15,000 for average properties
  const registrationFee = userOverrides.customRegistrationFee ?? calculateCartorioFees(price);

  // ── Broker Commission (Corretagem) ─────────────────────────────────────────
  // In Brazil, traditionally paid by seller (6% CRECI standard)
  // But in practice affects negotiated price; buyer should be aware
  // When buying direct from developer: usually 0% additional
  // When buying from individual: factored into asking price
  const brokerCommission = userOverrides.customBrokerFee ?? 0;
  // Note: We show it as informational (seller pays) but note it affects price

  // ── Legal Fees ─────────────────────────────────────────────────────────────
  // Optional but recommended: lawyer review
  // Typical R$2,000 - R$8,000
  const legalFees = Math.max(2000, price * 0.003);

  // ── Mortgage / Caixa Fees (if financed) ───────────────────────────────────
  let mortgageFee = 0;
  let evaluationFee = 0;
  if (financing.financingType !== 'cash') {
    evaluationFee = 3000; // Avaliação do imóvel (appraisal)
    mortgageFee = financing.loanAmount * 0.003; // IOF and Caixa fees ~0.3-0.5%
    if (financing.financingType === 'caixa') {
      mortgageFee += 1500; // Additional Caixa processing fees
    }
  }

  const renovationBudget = userOverrides.customRenovation ?? 0;
  const furnitureBudget = 0;

  const totalTransactionCosts =
    itbi + registrationFee + brokerCommission + legalFees + mortgageFee + evaluationFee + renovationBudget;

  const totalCashRequired = property.isNewDevelopment
    ? financing.downPaymentAmount + totalTransactionCosts
    : financing.downPaymentAmount + totalTransactionCosts;

  // ── ANNUAL COSTS ───────────────────────────────────────────────────────────

  // IPTU (Imposto Predial e Territorial Urbano)
  // Varies widely: ~0.2-1.5% of valor venal (assessed value, typically 50-80% of market)
  // We estimate from price with a factor
  const iptuAnnual = property.iptuAnnual ?? estimateIPTU(price, property.state, property.propertyType);

  // Condominium fees
  const condominiumAnnual = (property.condominiumMonthly ?? estimateCondominium(price, property.propertyType)) * 12;

  // Insurance (Seguro Residencial)
  // Typically 0.1-0.2% of property value per year
  const insurance = price * 0.0015;

  // Maintenance
  const maintenance = price * 0.005; // 0.5% of property value/year typical

  const managementFee = deal.rentalAssumptions.ltr.managementFeePercent > 0
    ? (deal.rentalAssumptions.ltr.monthlyRent * 12) * (deal.rentalAssumptions.ltr.managementFeePercent / 100)
    : 0;

  const annualTotal = iptuAnnual + condominiumAnnual + insurance + maintenance + managementFee;

  // ── RENTAL INCOME TAX ─────────────────────────────────────────────────────
  // Brazil: Carnê-Leão / IRPF on rental income
  // Monthly rental income taxed at progressive rates:
  // Up to R$2,259.20: 0%
  // R$2,259.21 - R$2,826.65: 7.5%
  // R$2,826.66 - R$3,751.05: 15%
  // R$3,751.06 - R$4,664.68: 22.5%
  // Above R$4,664.68: 27.5%
  //
  // Non-residents: 15% flat withholding tax (IRRF)
  // Companies (PJ - Pessoa Jurídica): Can use Lucro Presumido regime at ~11.33%

  let rentalTaxRate: number;
  let rentalTaxExplanation: string;
  const monthlyRent = deal.rentalAssumptions.ltr.monthlyRent;

  if (buyerProfile.citizenshipStatus === 'foreigner' && !buyerProfile.brazilianCPF) {
    rentalTaxRate = 15; // Non-resident IRRF
    rentalTaxExplanation = 'Non-resident flat withholding tax (IRRF) of 15% on gross rental income';
  } else if (buyerProfile.isCompanyPurchase) {
    rentalTaxRate = 11.33; // PJ Lucro Presumido (5.93% IRPJ + 1.8% CSLL + 3.6% PIS/COFINS)
    rentalTaxExplanation = 'Corporate (PJ) Lucro Presumido regime: ~11.33% effective rate';
  } else {
    // Individual progressive rate based on monthly rent
    rentalTaxRate = getBrazilRentalTaxRate(monthlyRent);
    rentalTaxExplanation = `Individual progressive IRPF rate based on R$${monthlyRent.toLocaleString('pt-BR')}/month rent`;
  }

  // ── CAPITAL GAINS TAX ─────────────────────────────────────────────────────
  // Brazil: GCAP (Ganho de Capital)
  // Residents:
  //   Up to R$5M gain: 15%
  //   R$5M-10M: 17.5%
  //   R$10M-20M: 20%
  //   Above R$20M: 22.5%
  // Exemption: sale of primary residence up to R$440,000 if no other sale in 5 years
  // Exemption: reinvestment in another property within 180 days
  // Non-residents: 15% flat (or 25% if in tax haven)

  let capitalGainsTaxRate: number;
  if (buyerProfile.citizenshipStatus === 'foreigner' && !buyerProfile.brazilianCPF) {
    capitalGainsTaxRate = 15;
  } else {
    capitalGainsTaxRate = 15; // Base rate (most transactions)
  }

  const notes: string[] = [
    `ITBI rate for ${property.state}: ${stateConfig.itbiRate}%`,
    'Broker commission (corretagem) of 6% is traditionally paid by seller and included in asking price',
    'IPTU is estimated; verify actual value with the municipality',
    buyerProfile.citizenshipStatus === 'foreigner'
      ? '⚠️ As a foreigner, you can purchase freely but must obtain a CPF. Consider consulting a Brazilian real estate lawyer.'
      : '',
    buyerProfile.isCompanyPurchase
      ? '💡 Purchasing via PJ (company) may offer tax advantages on rental income through Lucro Presumido regime'
      : '💡 High rental income earners may benefit from creating a PJ to optimize rental tax',
    financing.usesFGTS
      ? `FGTS balance of R$${(financing.fgtsAmount || 0).toLocaleString('pt-BR')} can be used for down payment or amortization`
      : '',
  ].filter(Boolean);

  return {
    purchase: {
      propertyPrice: price,
      itbi,
      registrationFee,
      brokerCommission,
      legalFees,
      mortgageArrangementFee: mortgageFee,
      evaluationFee,
      renovationBudget,
      furnitureBudget,
      otherCosts: 0,
      totalTransactionCosts,
      totalCashRequired,
    },
    annual: {
      iptu: iptuAnnual,
      condominium: condominiumAnnual,
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

// Calculate cartório (notary + registration) fees
// Based on São Paulo table (other states vary ±20%)
function calculateCartorioFees(price: number): number {
  if (price <= 100000) return 1500;
  if (price <= 250000) return 2500;
  if (price <= 500000) return 4000;
  if (price <= 1000000) return 6000;
  if (price <= 2000000) return 9000;
  if (price <= 5000000) return 14000;
  return price * 0.003; // ~0.3% for very large values
}

// Estimate IPTU from market price
function estimateIPTU(price: number, state: string, type: string): number {
  const stateFactor = BR_STATES[state]?.iptuFactor ?? 0.7;
  // Valor venal is typically 40-70% of market price
  const valorVenal = price * 0.55;
  // IPTU rate varies: 0.5-1.5% for residential
  const rate = type === 'commercial' ? 0.012 : 0.007;
  return valorVenal * rate * stateFactor;
}

// Estimate condominium fees
function estimateCondominium(price: number, type: string): number {
  if (type === 'house' || type === 'land') return 0;
  // Rough estimate: R$12-25/sqm/month for average condo
  // Proxy: 0.3-0.5% of property value per year / 12
  return (price * 0.004) / 12;
}

// Get progressive rental tax rate for Brazilian individual
export function getBrazilRentalTaxRate(monthlyRent: number): number {
  // 2025 IRPF brackets (monthly)
  if (monthlyRent <= 2259.20) return 0;
  if (monthlyRent <= 2826.65) return 7.5;
  if (monthlyRent <= 3751.05) return 15;
  if (monthlyRent <= 4664.68) return 22.5;
  return 27.5;
}

// Calculate annual rental income tax (Brazil)
export function calculateBrazilRentalTax(
  monthlyRent: number,
  isNonResident: boolean,
  isCompany: boolean
): number {
  if (isNonResident) {
    return monthlyRent * 12 * 0.15;
  }
  if (isCompany) {
    return monthlyRent * 12 * 0.1133;
  }

  // Progressive individual calculation
  let monthlyTax = 0;
  if (monthlyRent <= 2259.20) {
    monthlyTax = 0;
  } else if (monthlyRent <= 2826.65) {
    monthlyTax = (monthlyRent - 2259.20) * 0.075;
  } else if (monthlyRent <= 3751.05) {
    monthlyTax = (2826.65 - 2259.20) * 0.075 + (monthlyRent - 2826.65) * 0.15;
  } else if (monthlyRent <= 4664.68) {
    monthlyTax =
      (2826.65 - 2259.20) * 0.075 +
      (3751.05 - 2826.65) * 0.15 +
      (monthlyRent - 3751.05) * 0.225;
  } else {
    monthlyTax =
      (2826.65 - 2259.20) * 0.075 +
      (3751.05 - 2826.65) * 0.15 +
      (4664.68 - 3751.05) * 0.225 +
      (monthlyRent - 4664.68) * 0.275;
  }

  return monthlyTax * 12;
}
