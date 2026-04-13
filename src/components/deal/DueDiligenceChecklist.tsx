'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
  tip?: string;
}

interface Category {
  title: string;
  icon: string;
  items: CheckItem[];
}

function getBrazilChecklist(deal: Deal): Category[] {
  const isForeigner = deal.buyerProfile.citizenshipStatus === 'foreigner';
  const isFinanced = deal.financing.financingType !== 'cash';

  return [
    {
      title: 'Property Documents',
      icon: '🏠',
      items: [
        { id: 'matricula', label: 'Matrícula atualizada (últimos 30 dias)', description: 'Full property history from Cartório de Registro de Imóveis. Confirms ownership chain and any liens.', critical: true, tip: 'Request "Certidão de Inteiro Teor" — not just the summary.' },
        { id: 'habitese', label: 'Habite-se (Auto de Conclusão)', description: 'Occupancy permit issued by the municipality. Required for legal residential use and financing.', critical: !(deal.property.hasHabitese ?? true), tip: (deal.property.hasHabitese ?? true) ? 'Property has Habite-se ✓' : '⚠️ Property listed without Habite-se — investigate urgently.' },
        { id: 'iptu_cert', label: 'Certidão de quitação do IPTU', description: 'Confirms all IPTU (property tax) payments are up to date.', critical: true },
        { id: 'plantas', label: 'Plantas aprovadas pela Prefeitura', description: 'Approved building plans — verify the current layout matches approved plans.', critical: false, tip: 'Compare the approved plans with the physical layout. Unauthorized changes are the buyer\'s liability.' },
        { id: 'averbacao', label: 'Averbação de construção na matrícula', description: 'The building must be registered (averbado) in the property record.', critical: true },
        ...(deal.property.propertyType === 'apartment' ? [
          { id: 'convencao', label: 'Convenção e Regulamento Interno do condomínio', description: 'Condominium rules — check for STR/Airbnb restrictions, pet policies, renovation rules.', critical: deal.rentalAssumptions.strategy !== 'long-term', tip: 'Many condos in SP/RJ now prohibit short-term rentals by internal regulation.' },
          { id: 'atas', label: 'Atas das últimas 3 assembleias', description: 'Meeting minutes — reveals pending lawsuits, extraordinary expenses (obras), disputes.', critical: true },
          { id: 'condo_debitos', label: 'Certidão negativa de débitos condominiais', description: 'Confirms no outstanding condo fees. Buyer inherits debt if not cleared.', critical: true },
        ] : []),
      ],
    },
    {
      title: 'Seller Documents',
      icon: '👤',
      items: [
        { id: 'certidao_pf', label: 'Certidões negativas do vendedor (CPF/CNPJ)', description: 'Check for federal, state, and labor debts that could result in asset seizure.', critical: true, tip: 'Request certidões from: Receita Federal, Justiça Federal, TRT (labor), and state court.' },
        { id: 'certidao_civil', label: 'Certidão de casamento/estado civil', description: 'If married, both spouses must sign. Different rules apply depending on marriage regime.', critical: true },
        { id: 'procuracao', label: 'Procuração (if selling via representative)', description: 'If someone is signing on behalf of the seller, verify the power of attorney is valid and specific.', critical: true },
        { id: 'falencia', label: 'Certidão negativa de falência/concordata', description: 'Confirms the seller is not in bankruptcy proceedings.', critical: true },
      ],
    },
    {
      title: 'Financial & Legal',
      icon: '⚖️',
      items: [
        { id: 'alienacao', label: 'Verify no fiduciary alienation (alienação fiduciária)', description: 'Check matrícula for any existing mortgage/lien that must be cleared before transfer.', critical: true },
        { id: 'acoes_reais', label: 'Certidão de ações reais e pessoais', description: 'Search for any lawsuits involving the property.', critical: true },
        { id: 'valuation', label: 'Independent property valuation (laudemio check)', description: 'For properties near water/federal land in RJ, check for laudemio obligations.', critical: deal.property.state === 'RJ', tip: 'Properties on terrenos de marinha (federal coastal land) require laudemio payment of ~5% to the navy.' },
        ...(isFinanced ? [
          { id: 'bank_valuation', label: 'Bank appraisal (laudo de avaliação)', description: 'Bank will order its own appraisal. Ensure agreed price aligns with expected appraised value.', critical: true, tip: 'If bank appraises lower than agreed price, financing gap must be covered with cash.' },
        ] : []),
      ],
    },
    ...(isForeigner ? [{
      title: 'Foreign Buyer Requirements',
      icon: '🌍',
      items: [
        { id: 'cpf', label: 'Brazilian CPF registered', description: 'Mandatory for all foreign buyers. Apply at Brazilian consulate or Receita Federal.', critical: true, tip: 'Processing time: 1-4 weeks at consulate. Can also apply in person at any Banco do Brasil in Brazil.' },
        { id: 'banco', label: 'Brazilian bank account or transfer method', description: 'Funds must be traceable for Receita Federal. Use Nubank, Itaú, or Banco do Brasil.', critical: true },
        { id: 'remessa', label: 'BACEN registration for foreign capital', description: 'Wire transfer from abroad must be registered as foreign capital (RDE-ROF) with Central Bank.', critical: true, tip: 'Your Brazilian lawyer handles this. Required to repatriate proceeds when you sell.' },
        { id: 'tax_reporting', label: 'Israeli/home country tax reporting plan', description: 'Consult your home country accountant before purchase. Acquisition must be reported within 30 days in Israel (Form 1301).', critical: deal.buyerProfile.taxResidency === 'IL' },
      ],
    }] : []),
    {
      title: 'Physical Inspection',
      icon: '🔍',
      items: [
        { id: 'vistoria', label: 'Professional vistoria (inspection report)', description: 'Hire a certified engineer (engenheiro civil) for structural and systems assessment.', critical: false, tip: 'Cost: R$500-2,000 depending on property size. Always worth it.' },
        { id: 'umidade', label: 'Check for moisture/humidity (umidade)', description: 'Very common in Brazilian coastal cities. Check walls, ceilings, and bathrooms carefully.', critical: false },
        { id: 'instalacoes', label: 'Electrical and plumbing inspection', description: 'Verify compliance with ABNT standards, especially in older buildings.', critical: false },
        { id: 'medidas', label: 'Verify actual area matches registration', description: 'Measure the actual usable area. Some properties are registered with discrepancies.', critical: false },
      ],
    },
    {
      title: 'Before Signing',
      icon: '✍️',
      items: [
        { id: 'advogado', label: 'Hire an independent Brazilian real estate lawyer', description: 'Do not rely on the seller\'s lawyer. Your lawyer reviews the contract (compromisso de compra e venda).', critical: true, tip: 'Cost: 0.5-1% of property value. Non-negotiable for foreign buyers.' },
        { id: 'contrato', label: 'Review compromisso de compra e venda clauses', description: 'Check penalty clauses, delivery conditions, ITBI responsibility, and cancellation terms.', critical: true },
        { id: 'itbi_calc', label: 'Confirm ITBI rate with the municipality', description: `Your estimated ITBI: R$${deal.analysis?.purchaseCosts.itbi?.toLocaleString('pt-BR') ?? '—'}. Confirm with Prefeitura de ${deal.property.city}.`, critical: false },
        { id: 'seguro', label: 'Arrange property insurance before handover', description: 'Get quotes from Porto Seguro, HDI, or Caixa Seguros before closing.', critical: false },
      ],
    },
  ];
}

function getIsraelChecklist(deal: Deal): Category[] {
  const isForeigner = deal.buyerProfile.citizenshipStatus === 'foreigner';
  const isFinanced = deal.financing.financingType !== 'cash';
  const isIsraeliTaxResident = deal.buyerProfile.taxResidency === 'IL';

  return [
    {
      title: 'Property Documents (Israel)',
      icon: '🏠',
      items: [
        { id: 'nessah_tabu', label: "Nesach Tabu (נסח טאבו) — Land Registry Extract", description: "Current ownership certificate from the Land Registry (Tabu). Confirms the seller is the legal owner and shows any liens or mortgages.", critical: true, tip: "Order from rasham.gov.il. Must be current (within 30 days)." },
        { id: 'hitnahalut', label: "Hiter LeMakira / ownership confirmation", description: "For non-Tabu properties (Israel Lands Authority / Minhal): get written confirmation of rights.", critical: deal.property.state !== 'tabu', tip: "Many Israeli properties are ILA-managed — check the registration type." },
        { id: 'tochni_binyan', label: "Building permit & approved plans (Tochni Binyan)", description: "Verify building plans were approved by local municipality. Unauthorized additions are common.", critical: true, tip: "Request from local municipality (Iriya). Verify built area matches permit." },
        { id: 'arnona_debts', label: "Arnona payment clearance", description: "Confirm no outstanding municipal tax (Arnona) debt. Buyer may inherit unpaid amounts.", critical: true },
        ...(deal.property.propertyType === 'apartment' ? [
          { id: 'bait_meshutaf', label: "Vaad Bayit budget & meeting minutes", description: "Review last 2-3 years of building committee decisions. Check for pending major expenses.", critical: true, tip: "Ask for the last 3 years of vaad bayit meeting minutes (protocols)." },
          { id: 'vaad_debts', label: "Vaad Bayit debt clearance", description: "Confirm seller has no outstanding building maintenance fees.", critical: true },
        ] : []),
      ],
    },
    {
      title: 'Seller Verification',
      icon: '👤',
      items: [
        { id: 'seller_id', label: "Verify seller identity & marital status", description: "Both spouses must sign if married (regardless of property registration). Divorce settlements may affect rights.", critical: true },
        { id: 'executor', label: "Power of attorney / estate (if applicable)", description: "If selling via representative or as an estate, verify POA (ייפוי כוח) is valid and notarized.", critical: true },
        { id: 'liens', label: "Check for liens & mortgages (שיעבודים)", description: "Confirm no bank liens, attachment orders (עיקולים), or notes (הערות אזהרה) on the Tabu extract.", critical: true },
        { id: 'creditors', label: "Bankruptcy / execution office search", description: "Search execution office (Hotzaa Lapoal) for active proceedings against the seller.", critical: true, tip: "Your lawyer can run this search. Especially important for private sales." },
      ],
    },
    {
      title: 'Financial & Legal',
      icon: '⚖️',
      items: [
        { id: 'mas_rechisha', label: "Mas Rechisha calculation confirmed", description: `Estimated Mas Rechisha: ₪${deal.analysis?.purchaseCosts.itbi?.toLocaleString() ?? '—'}. Confirm with your accountant.`, critical: true, tip: "First-home vs. investment bracket is critical — overpaying is common." },
        { id: 'shivuch', label: "Hitkul Hashvacha (betterment levy) check", description: "Check with local planning board if a betterment levy (היטל השבחה) is owed by the seller.", critical: false, tip: "Typically seller's responsibility, but negotiate who bears this cost." },
        { id: 'independent_valuation', label: "Independent market valuation (Shama'ut)", description: "Get an independent appraiser (shama'i) to value the property — especially important for negotiations.", critical: false, tip: "Cost: ₪1,500-3,000. Helps determine fair price and challenge over-pricing." },
        ...(isFinanced ? [
          { id: 'bank_shama', label: "Bank appraisal (Shama'ut Bankait)", description: "Bank will order their own appraisal. If below agreed price, you must cover the gap in cash.", critical: true },
          { id: 'mashkanta_advisor', label: "Mortgage advisor (Yoetz Mashkanta)", description: "Use a licensed mortgage advisor to compare routes and rates across banks.", critical: false, tip: "Fee: ₪1,500-3,000. Can save significantly over the life of the mortgage." },
        ] : []),
      ],
    },
    ...(isForeigner ? [{
      title: 'Foreign Buyer Requirements',
      icon: '🌍',
      items: [
        { id: 'funds_transfer', label: "Legal fund transfer documentation", description: "Wire transfer must be documented (bank SWIFT confirmation, origin of funds declaration).", critical: true, tip: "Israeli bank may require source-of-funds declaration (הצהרת מקור כספים)." },
        { id: 'tax_id_il', label: "Israeli tax file number (Mispar Tik Mas)", description: "Required to file Mas Rechisha declaration and for tax compliance. Apply to the Israel Tax Authority.", critical: true },
        { id: 'home_country_reporting', label: "Home country tax reporting plan", description: "If Israeli tax resident: report acquisition within 30 days (Form 1301). Consult cross-border accountant.", critical: isIsraeliTaxResident, tip: "Israeli residents must notify ITA within 30 days of acquiring foreign/Israeli real estate." },
      ],
    }] : [
      ...(isIsraeliTaxResident ? [{
        title: 'Tax Reporting (Israeli Resident)',
        icon: '📋',
        items: [
          { id: 'mas_form', label: "File Mas Rechisha declaration (form 7000)", description: "Must be filed within 50 days of signing. Your lawyer typically handles this.", critical: true },
          { id: 'rental_tax_track', label: "Choose rental tax track (if renting)", description: "Decide between Track 1 (exempt threshold), Track 2 (10% flat), or Track 3 (marginal with deductions).", critical: deal.rentalAssumptions.strategy !== 'none', tip: "Track 2 (10%) is simplest and often optimal. Consult an accountant for Track 3." },
        ],
      }] : []),
    ]),
    {
      title: 'Physical Inspection',
      icon: '🔍',
      items: [
        { id: 'structural', label: "Structural inspection (Bedikat Mivne)", description: "Hire a licensed structural engineer to assess foundations, walls, roof.", critical: false, tip: "Cost: ₪1,500-4,000. Essential for older buildings (pre-1980)." },
        { id: 'tama38', label: "TAMA 38 / Pinui-Binui eligibility check", description: "If in an older building, check if it qualifies for government-backed strengthening program — affects value.", critical: false, tip: "TAMA 38 can significantly increase property value. Check with local planning office." },
        { id: 'radon', label: "Radon and mold check", description: "Check for radon gas (common in certain Israeli geological areas) and moisture/mold.", critical: false },
        { id: 'area_verify', label: "Verify exact net area (שטח נטו)", description: "Israeli listings often include public areas. Verify the actual apartment area vs. common areas.", critical: true, tip: "Demand the floor plan breakdown: net area vs. mutzkav (registered) vs. gross area." },
      ],
    },
    {
      title: 'Before Signing',
      icon: '✍️',
      items: [
        { id: 'lawyer_il', label: "Hire an independent Israeli real estate lawyer (Orech Din)", description: "Non-negotiable. Your lawyer reviews the purchase agreement (haskam rechisha), registers the deal, and handles Mas Rechisha.", critical: true, tip: "Cost: 0.5-1% + VAT. Do not use the seller's lawyer." },
        { id: 'heara_azhara', label: "Register a Note of Warning (הערת אזהרה)", description: "After signing the purchase agreement, immediately register a note of warning in the Tabu to protect your rights.", critical: true, tip: "This prevents the seller from selling to someone else or taking a new mortgage." },
        { id: 'insurance_il', label: "Arrange building & contents insurance", description: "Get quotes before closing. Required by mortgage bank if financed.", critical: false },
        { id: 'notary', label: "Notarized signatures (if non-resident)", description: "Foreign buyers signing documents abroad need notarization + Apostille.", critical: isForeigner },
      ],
    },
  ];
}

function getUSAChecklist(deal: Deal): Category[] {
  const isForeigner = deal.buyerProfile.citizenshipStatus === 'foreigner';
  const isFinanced = deal.financing.financingType !== 'cash';
  const isCompany = deal.buyerProfile.isCompanyPurchase;

  return [
    {
      title: 'Title & Ownership',
      icon: '🏠',
      items: [
        { id: 'title_search', label: 'Title search (last 40-60 years)', description: "Attorney or title company searches public records for liens, encumbrances, and chain of ownership.", critical: true, tip: "Always use an independent title company, not the seller's agent's preferred vendor." },
        { id: 'title_insurance', label: "Owner's title insurance policy", description: "Protects against future title claims not discovered in the search. One-time premium at closing.", critical: true, tip: "Lender requires a lender policy; also purchase an owner's policy for yourself." },
        { id: 'deed_type', label: "Confirm deed type (Warranty vs Quitclaim)", description: "General warranty deed gives strongest protection. Quitclaim deed offers no guarantee of clean title.", critical: true },
        { id: 'liens', label: "Confirm no liens, judgments, or lis pendens", description: "Search for IRS/tax liens, mechanic's liens, HOA liens, and any pending litigation on the property.", critical: true, tip: "Title company search covers this, but double-check with the county recorder." },
        ...(deal.property.propertyType === 'apartment' || deal.property.propertyType === 'condo' ? [
          { id: 'hoa_docs', label: "HOA documents, CC&Rs, and bylaws", description: "Review CC&Rs (rules), budget, reserve fund, and minutes. Check for STR restrictions, rental caps, and pending assessments.", critical: true, tip: "Many FL/NY condos have rental restrictions or require board approval for rentals." },
          { id: 'hoa_financials', label: "HOA financials & reserve study", description: "Underfunded reserve = future special assessment risk. Request last 2 years of financials.", critical: true, tip: "Florida: Condo Act requires reserves for certain components. Ask for the reserve study." },
        ] : []),
      ],
    },
    {
      title: 'Property Documents',
      icon: '📄',
      items: [
        { id: 'survey', label: "Property survey (boundary survey)", description: "Confirms lot lines, easements, and encroachments. Required by lenders in most states.", critical: isFinanced, tip: "ALTA/NSPS survey gives most comprehensive protection for buyers." },
        { id: 'zoning', label: "Verify zoning and permitted use", description: "Confirm property is zoned for intended use (residential, investment, STR). Check local ordinances.", critical: true, tip: "STR licensing may be required by city/county even if zoning allows it." },
        { id: 'permits', label: "Pull permit history from county", description: "Verify all renovations had proper permits. Unpermitted work is the buyer's liability.", critical: true, tip: "Search the county building department portal. Unpermitted additions = legal liability and financing issues." },
        { id: 'tax_records', label: "Property tax records & exemptions", description: "Verify current tax amount. Check if seller has homestead exemption (which buyer loses — taxes may increase).", critical: true, tip: "FL homestead exemption can reduce taxes by $50K+. Non-primary buyers don't qualify." },
        { id: 'flood_zone', label: "FEMA flood zone determination", description: "Check FEMA flood map. If in special flood hazard area (SFHA), flood insurance required.", critical: deal.property.state === 'FL' || deal.property.state === 'TX' || deal.property.state === 'LA', tip: "Flood insurance can add $2K-15K/yr. Check FEMA Map Service Center." },
      ],
    },
    {
      title: 'Physical Inspection',
      icon: '🔍',
      items: [
        { id: 'home_inspection', label: "General home inspection (ASHI/InterNACHI certified)", description: "Comprehensive inspection of structural, mechanical, electrical, plumbing, and roofing systems.", critical: true, tip: "Cost: $300-600. Attend the inspection in person. Never waive inspection contingency." },
        { id: 'roof', label: "Roof inspection and age verification", description: "Insurance companies in FL/TX may deny coverage for roofs >15 years old. Get roof age in writing.", critical: deal.property.state === 'FL' || deal.property.state === 'TX', tip: "In Florida, insurance carriers often require roof replacement if >15-20 years old." },
        { id: 'four_point', label: "4-Point inspection (FL/TX)", description: "Insurance requirement in FL/TX covering HVAC, electrical, plumbing, and roof.", critical: deal.property.state === 'FL' || deal.property.state === 'TX', tip: "Required by most FL insurers for homes >10 years old." },
        { id: 'termites', label: "WDO / termite inspection", description: "Wood-Destroying Organism inspection. Required by lenders in FL, GA, SC, and other states.", critical: deal.property.state === 'FL' || deal.property.state === 'GA' || deal.property.state === 'SC', tip: "Cost: $100-300. Termite damage is extremely common in humid southern states." },
        { id: 'environmental', label: "Environmental assessment (older homes)", description: "Test for lead paint (pre-1978 homes), asbestos, and radon gas.", critical: (deal.property.yearBuilt ?? 2010) < 1978, tip: "Lead paint disclosure required by federal law for pre-1978 homes. Radon test: $15 DIY kit." },
      ],
    },
    {
      title: 'Financial & Legal',
      icon: '⚖️',
      items: [
        { id: 'appraisal', label: "Independent appraisal (lender-ordered)", description: "Lender orders appraisal. If value < purchase price, financing gap must be covered in cash or deal renegotiated.", critical: isFinanced, tip: "Include appraisal contingency in offer. If it comes in low, you can negotiate price or walk away." },
        { id: 'insurance_quote', label: "Homeowners insurance quote before closing", description: "In FL/TX, insurance is extremely expensive and may affect deal economics. Get quotes before committing.", critical: deal.property.state === 'FL' || deal.property.state === 'TX', tip: "Florida average insurance: $3,000-8,000+/yr. Some carriers are withdrawing from FL market." },
        { id: 'closing_costs', label: "Review Closing Disclosure (CD) 3 days before closing", description: "Lender must provide CD 3 business days before closing. Review all fees carefully.", critical: isFinanced },
        { id: 'title_co', label: "Choose independent closing/escrow company", description: "In some states, closing is handled by attorney; in others by title company. Use an independent one.", critical: true },
        ...(isForeigner ? [
          { id: 'firpta', label: "FIRPTA withholding planning (15% of sale price)", description: "At future sale, 15% of gross price is withheld from foreign sellers. Plan for this in exit strategy.", critical: true, tip: "File for reduced withholding (Form 8288-B) if actual gain is lower. Consult US CPA." },
          { id: 'itin', label: "ITIN (Individual Taxpayer Identification Number)", description: "Required for filing US tax returns on rental income. Apply via Form W-7.", critical: true, tip: "Processing: 7-11 weeks. Your US CPA can help. Needed before first US tax filing." },
          { id: 'w8eci', label: "Form W-8ECI for rental income", description: "Elect 'effectively connected income' (ECI) treatment on rental income — taxed at regular rates with deductions instead of 30% gross withholding.", critical: true, tip: "Without W-8ECI, tenant must withhold 30% of gross rent. File W-8ECI with tenant/PM." },
        ] : []),
        ...(isCompany ? [
          { id: 'llc_docs', label: "LLC operating agreement and state registration", description: "Verify LLC is properly formed in target state or registered as foreign LLC.", critical: true },
          { id: 'ein', label: "EIN (Employer Identification Number) for LLC", description: "Required for LLC bank account and tax filing.", critical: true, tip: "Apply online at IRS.gov — instant EIN issuance." },
        ] : []),
      ],
    },
    ...(isForeigner ? [{
      title: 'Foreign Buyer Requirements',
      icon: '🌍',
      items: [
        { id: 'wire_transfer', label: "Wire transfer documentation for down payment", description: "US title companies require wire transfers — personal checks not accepted. Document source of funds.", critical: true, tip: "Wire must come from your personal/LLC bank account. Third-party wires often rejected." },
        { id: 'us_bank_account', label: "US bank account for transactions", description: "Strongly recommended for receiving rent, paying expenses, and demonstrating income to IRS.", critical: false, tip: "Many banks will open accounts for foreign nationals with passport + ITIN." },
        { id: 'us_cpa', label: "Hire US CPA specializing in non-resident investors", description: "US tax compliance is complex for foreign investors — FIRPTA, ITIN, state taxes, treaty benefits.", critical: true, tip: "Find a CPA on AICPA.org. Specialization in 'non-resident alien real estate' is important." },
        { id: 'home_country_reporting', label: "Home country tax reporting", description: "Acquisition of US real estate must be reported to your home country tax authority. Israeli residents: Form 1301 within 30 days.", critical: deal.buyerProfile.taxResidency === 'IL', tip: "Consult a cross-border tax accountant familiar with both US and your home country tax treaty." },
      ],
    }] : []),
    {
      title: 'Before Closing',
      icon: '✍️',
      items: [
        { id: 'final_walkthrough', label: "Final walkthrough (24-48 hrs before closing)", description: "Verify property condition is as agreed, seller has vacated, and all included items are present.", critical: true },
        { id: 'escrow_review', label: "Review escrow/closing statement line by line", description: "Verify all credits, debits, prorations, and fees. Compare to Loan Estimate and Closing Disclosure.", critical: true },
        { id: 'llc_consideration', label: "Consider LLC structure for liability protection", description: "Holding investment property in an LLC limits personal liability. Set up before closing for cleanest structure.", critical: false, tip: "Cost: $100-500 state filing fee. Some states (CA) charge annual LLC fees. Consult attorney." },
        { id: 'property_management', label: "Property management contract reviewed", description: "If using PM company, review contract terms: fee structure, maintenance authorization limits, termination clauses.", critical: deal.rentalAssumptions.strategy !== 'none', tip: "Standard PM fee: 8-12% of monthly rent. Leasing fee: 50-100% of first month." },
      ],
    },
  ];
}

function getChecklist(deal: Deal): Category[] {
  if (deal.property.country === 'IL') {
    return getIsraelChecklist(deal);
  }
  if (deal.property.country === 'US') {
    return getUSAChecklist(deal);
  }
  return getBrazilChecklist(deal);
}

export function DueDiligenceChecklist({ deal }: { deal: Deal }) {
  const checklist = getChecklist(deal);
  const allItems = checklist.flatMap(c => c.items);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(checklist.map(c => c.title)));

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCategory = (title: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  const criticalItems = allItems.filter(i => i.critical);
  const criticalDone = criticalItems.filter(i => checked.has(i.id)).length;
  const totalDone = checked.size;
  const progress = Math.round((totalDone / allItems.length) * 100);

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">Due Diligence Checklist</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {deal.property.rooms}BR in {deal.property.city} · {totalDone}/{allItems.length} items completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{progress}%</div>
            <div className="text-xs text-slate-400">complete</div>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className={`flex items-center gap-1 font-medium ${criticalDone === criticalItems.length ? 'text-emerald-600' : 'text-red-600'}`}>
            <AlertTriangle className="w-3 h-3" />
            {criticalDone}/{criticalItems.length} critical items done
          </span>
          {deal.property.country === 'BR' && !deal.buyerProfile.brazilianCPF && (
            <span className="text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> CPF not obtained
            </span>
          )}
        </div>
      </div>

      {/* Categories */}
      {checklist.map(category => {
        const isOpen = expanded.has(category.title);
        const catDone = category.items.filter(i => checked.has(i.id)).length;
        return (
          <div key={category.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory(category.title)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{category.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">{category.title}</div>
                  <div className="text-xs text-slate-400">{catDone}/{category.items.length} completed</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(catDone / category.items.length) * 100}%` }} />
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {category.items.map(item => {
                  const isDone = checked.has(item.id);
                  return (
                    <div key={item.id}
                      className={`px-5 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isDone ? 'opacity-60' : ''}`}
                      onClick={() => toggle(item.id)}
                    >
                      {isDone
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <Circle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.critical ? 'text-red-400' : 'text-slate-300'}`} />
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {item.label}
                          </span>
                          {item.critical && !isDone && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Critical</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                        {item.tip && (
                          <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded px-2 py-1">💡 {item.tip}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-slate-400 text-center">
        This checklist is a guide, not legal advice. Always work with a licensed local real estate attorney.
        {deal.property.country === 'IL'
          ? ' Israel: Orech Din (עורך דין נדל"ן).'
          : deal.property.country === 'US'
          ? ' US: Real estate attorney (especially for foreign buyers).'
          : ' Brazil: Advogado especializado em imóveis.'}
      </p>
    </div>
  );
}
