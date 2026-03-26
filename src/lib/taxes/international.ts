/**
 * International Tax Profile
 * Handles multi-country tax obligations for foreign investors in Brazil.
 * Focus: Israeli residents (with or without dual citizenship) investing in Brazil.
 */

export type TaxResidency = 'IL' | 'RO' | 'US' | 'UK' | 'DE' | 'PT' | 'ES' | 'AE' | 'FR' | 'OTHER' | 'BR';

export interface InternationalTaxProfile {
  taxResidency: TaxResidency;
  citizenships: string[]; // e.g. ['IL', 'RO']
  hasRomanianPassport: boolean;
  hasIsraeliTaxObligation: boolean;
  isEUCitizen: boolean;
}

export interface IsraeliTaxAnalysis {
  rentalIncomeTrack: 'flat15' | 'flat10' | 'marginal';
  rentalTaxRateIsrael: number;
  brazilTaxCredit: number;
  effectiveCombinedRate: number;
  annualTaxInIsrael: number;
  capitalGainsTaxIsrael: number;
  reportingObligation: string;
  recommendations: string[];
  notes: string[];
}

// Israel Section 122A - Special track for foreign rental income (as of 2025)
// 15% flat on net income (after mortgage interest deduction only)
// OR 10% flat on gross (if total rental income below certain threshold)
// OR regular marginal rate with full deductions
export function calculateIsraeliTaxOnBrazilianRent(
  monthlyRent: number,
  brazilTaxAlreadyPaid: number,
  mortgageInterestAnnual: number,
  annualIncome: number // Israeli + foreign combined
): IsraeliTaxAnalysis {
  const annualRent = monthlyRent * 12;

  // Track 1: Flat 15% on net (rent - mortgage interest)
  const track15Net = Math.max(0, annualRent - mortgageInterestAnnual);
  const tax15 = track15Net * 0.15;
  const creditForBrazil15 = Math.min(brazilTaxAlreadyPaid, tax15);
  const net15AfterCredit = Math.max(0, tax15 - creditForBrazil15);

  // Track 2: Flat 10% on gross (simplified, requires specific conditions)
  const tax10 = annualRent * 0.10;
  const creditForBrazil10 = Math.min(brazilTaxAlreadyPaid, tax10);
  const net10AfterCredit = Math.max(0, tax10 - creditForBrazil10);

  // Track 3: Marginal rate (max 50% for high income) with full deductions
  // Simplified: use 35% marginal for this estimate
  const marginalRate = annualIncome > 700000 ? 0.50 : annualIncome > 300000 ? 0.47 : 0.35;
  const taxMarginal = annualRent * marginalRate;
  const creditMarginal = Math.min(brazilTaxAlreadyPaid, taxMarginal);
  const netMarginalAfterCredit = Math.max(0, taxMarginal - creditMarginal);

  // Find optimal track
  const tracks = [
    { name: 'flat15' as const, tax: net15AfterCredit, rate: 15 },
    { name: 'flat10' as const, tax: net10AfterCredit, rate: 10 },
    { name: 'marginal' as const, tax: netMarginalAfterCredit, rate: marginalRate * 100 },
  ];
  const optimal = tracks.reduce((min, t) => (t.tax < min.tax ? t : min));

  // Capital gains: 25% in Israel on gain (after credit for Brazilian GCAP 15%)
  // Net: up to 10% additional Israeli CGT on top of Brazilian tax
  const capitalGainsTaxIsrael = 25; // % of gain, but reduced by Brazil credit

  const recommendations: string[] = [];
  const notes: string[] = [];

  if (optimal.name === 'flat15') {
    recommendations.push(
      'Use Section 122A track: 15% flat on net foreign rental income (after mortgage interest). This is typically optimal for leveraged properties.'
    );
  } else if (optimal.name === 'flat10') {
    recommendations.push(
      'Section 122A "10% track": available if total rental income (Israel + abroad) meets threshold. Consult Israeli CPA.'
    );
  } else {
    recommendations.push(
      'Regular marginal track with full expense deductions may be optimal for high-expense properties. Requires detailed record-keeping.'
    );
  }

  if (brazilTaxAlreadyPaid > 0) {
    recommendations.push(
      `Brazilian taxes paid (R$ equivalent) can be credited against Israeli tax. Credit amount depends on ITA rules and exchange rate at payment date.`
    );
  }

  notes.push('Must report foreign real estate income in Israel on annual tax return (Form 1301).');
  notes.push('Deadline: April 30 (or extended with accountant authorization).');
  notes.push('Property acquisition and sale must be reported to Israeli Tax Authority within 30 days.');
  notes.push('Israeli tax is calculated in NIS at Bank of Israel exchange rate on income date.');

  if (monthlyRent > 5000) {
    notes.push(
      '⚠️ High rental income: Israeli marginal rates can reach 50%. The flat 15% Section 122A track is likely significantly more favorable.'
    );
  }

  return {
    rentalIncomeTrack: optimal.name,
    rentalTaxRateIsrael: optimal.rate,
    brazilTaxCredit: creditForBrazil15,
    effectiveCombinedRate: ((brazilTaxAlreadyPaid + net15AfterCredit) / annualRent) * 100,
    annualTaxInIsrael: optimal.tax,
    capitalGainsTaxIsrael,
    reportingObligation: 'Annual Israeli tax return (Form 1301) + foreign assets report (Form 150 if >₪1.9M).',
    recommendations,
    notes,
  };
}

// Romania tax profile (for dual IL+RO citizens)
export interface RomanianTaxAnalysis {
  isRelevant: boolean;
  rentalTaxRate: number;
  capitalGainsTaxRate: number;
  brazilRomaniaTreaty: boolean;
  notes: string[];
}

export function analyzeRomanianTaxRelevance(
  isRomanianTaxResident: boolean
): RomanianTaxAnalysis {
  const notes: string[] = [];

  if (!isRomanianTaxResident) {
    notes.push(
      'Romanian passport (citizenship) does NOT make you a Romanian tax resident. Tax residency is determined by where you spend 183+ days/year or have your center of vital interests.'
    );
    notes.push(
      'Most Israeli citizens with Romanian passports are Israeli tax residents — Romanian tax law is therefore NOT applicable to their Brazilian rental income.'
    );
    notes.push(
      'The Romanian passport primarily provides: EU freedom of movement, EU banking access, and visa-free travel — but does not affect Brazilian or Israeli tax obligations.'
    );

    return {
      isRelevant: false,
      rentalTaxRate: 0,
      capitalGainsTaxRate: 0,
      brazilRomaniaTreaty: false,
      notes,
    };
  }

  // If actually Romanian tax resident:
  notes.push(
    'As a Romanian tax resident: 10% flat income tax on worldwide rental income. Romania has no specific tax treaty with Brazil, but unilateral credit may apply.'
  );
  notes.push(
    '⚠️ If you are Romanian tax resident, you may still have Israeli reporting obligations if you spent significant time in Israel. This requires careful cross-border tax planning.'
  );
  notes.push(
    'Romanian CGT: 10% on real estate gains held over 3 years. Lower than Israeli 25% or Brazilian 15%.'
  );

  return {
    isRelevant: true,
    rentalTaxRate: 10,
    capitalGainsTaxRate: 10,
    brazilRomaniaTreaty: false, // Brazil-Romania: no bilateral tax treaty as of 2025
    notes,
  };
}

export interface CrossBorderTaxSummary {
  profile: string;
  brazilTax: { rentalRate: number; purchaseTax: string; cgt: number };
  homeTax: { country: string; rentalRate: number; cgt: number; canCreditBrazilTax: boolean };
  effectiveCombinedRentalRate: number;
  keyConsiderations: string[];
  actionItems: string[];
}

export function buildCrossBorderSummary(
  taxResidency: string,
  brazilRentalTaxRate: number,
  brazilItbi: number,
  propertyPrice: number,
  monthlyRent: number,
  hasRomanianPassport: boolean
): CrossBorderTaxSummary {
  const annualRent = monthlyRent * 12;
  const brazilTaxAnnual = annualRent * (brazilRentalTaxRate / 100);

  let homeTax = { country: 'Israel', rentalRate: 15, cgt: 25, canCreditBrazilTax: true };
  let keyConsiderations: string[] = [];
  let actionItems: string[] = [];

  if (taxResidency === 'IL') {
    homeTax = { country: 'Israel', rentalRate: 15, cgt: 25, canCreditBrazilTax: true };

    const israelTaxOnTop = Math.max(0, annualRent * 0.15 - brazilTaxAnnual);
    const effectiveCombined = ((brazilTaxAnnual + israelTaxOnTop) / annualRent) * 100;

    keyConsiderations = [
      `Israeli Section 122A: 15% flat on net Brazilian rental income. Brazilian taxes paid are credited — effective Israeli top-up is ~${Math.max(0, 15 - brazilRentalTaxRate).toFixed(0)}%.`,
      hasRomanianPassport
        ? '🇷🇴 Romanian passport: useful for EU banking, MiCA crypto access, and EU travel — but does NOT reduce Israeli or Brazilian tax obligations (unless you relocate to Romania).'
        : '',
      `Brazil-Israel: No bilateral tax treaty. Unilateral credit under Israeli law (Section 200) applies.`,
      `Israeli "Foreign Assets" report (Form 150) required if property value exceeds ₪1.9M (~R$2.4M).`,
      `Annual Israeli filing required (Form 1301) reporting all foreign income.`,
    ].filter(Boolean);

    actionItems = [
      'Consult an Israeli CPA (רואה חשבון) with cross-border experience BEFORE purchase.',
      'Obtain CPF in Brazil — can be done at Brazilian consulate in Tel Aviv.',
      'Open a Brazilian bank account (Nubank or Itaú accept foreigners with CPF).',
      'Register the acquisition with Israeli Tax Authority within 30 days of purchase.',
      'Consider Section 122A election: file with Israeli ITA to use the 15% flat track.',
      hasRomanianPassport ? 'Your Romanian passport may help open a European bank account for receiving rental transfers in EUR, reducing conversion costs.' : '',
    ].filter(Boolean);

    return {
      profile: hasRomanianPassport
        ? 'Israeli tax resident with Israeli + Romanian citizenship'
        : 'Israeli tax resident',
      brazilTax: {
        rentalRate: brazilRentalTaxRate,
        purchaseTax: `ITBI ${((brazilItbi / propertyPrice) * 100).toFixed(1)}%`,
        cgt: 15,
      },
      homeTax,
      effectiveCombinedRentalRate: Math.min(effectiveCombined, 50),
      keyConsiderations,
      actionItems,
    };
  }

  if (taxResidency === 'RO') {
    homeTax = { country: 'Romania', rentalRate: 10, cgt: 10, canCreditBrazilTax: false };
    keyConsiderations = [
      'As Romanian tax resident: 10% flat income tax on worldwide rental income.',
      'No Brazil-Romania bilateral tax treaty — credit for Brazilian taxes is by unilateral Romanian law.',
      'Romanian CGT: 10% on gains after 3 years. Competitive rate.',
      '⚠️ If you are also an Israeli citizen spending significant time in Israel, verify you have cleanly established Romanian tax residency to avoid dual-residency issues.',
    ];
    actionItems = [
      'Consult a Romanian tax advisor (consultant fiscal) regarding foreign income reporting.',
      'Obtain CPF in Brazil.',
      'File Romanian "Declaration D212" for foreign income annually.',
    ];
  }

  if (taxResidency === 'AE') {
    homeTax = { country: 'UAE', rentalRate: 0, cgt: 0, canCreditBrazilTax: false };
    keyConsiderations = [
      '🇦🇪 UAE tax residency: No personal income tax or CGT. Only Brazilian taxes apply.',
      'Must establish genuine UAE tax residency (Emirates ID, 183+ days/year or primary residence).',
      hasRomanianPassport ? 'Romanian passport + UAE residency is a powerful combination for global investment.' : '',
    ].filter(Boolean);
    actionItems = [
      'Ensure UAE tax residency certificate is valid.',
      'Obtain CPF in Brazil.',
      'Brazilian IRRF (15%) applies as withholding on rental — this is your only tax cost.',
    ];
  }

  return {
    profile: `${taxResidency} tax resident`,
    brazilTax: {
      rentalRate: brazilRentalTaxRate,
      purchaseTax: `ITBI ${((brazilItbi / propertyPrice) * 100).toFixed(1)}%`,
      cgt: 15,
    },
    homeTax,
    effectiveCombinedRentalRate: brazilRentalTaxRate,
    keyConsiderations,
    actionItems,
  };
}
