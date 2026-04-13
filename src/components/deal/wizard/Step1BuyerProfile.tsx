'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { CitizenshipStatus, CountryCode, TaxResidencyCode } from '@/lib/types/deal';

interface Props {
  onNext: () => void;
}

const MARKET_OPTIONS = [
  { code: 'BR' as CountryCode, flag: '🇧🇷', name: 'Brazil', desc: 'BRL · São Paulo, Rio, Florianópolis...' },
  { code: 'IL' as CountryCode, flag: '🇮🇱', name: 'Israel', desc: '₪ · Tel Aviv, Jerusalem, Haifa...' },
  { code: 'US' as CountryCode, flag: '🇺🇸', name: 'United States', desc: '$ · Miami, NYC, Austin, LA...' },
];

function getCitizenshipOptions(market: CountryCode): { value: CitizenshipStatus; label: string; desc: string }[] {
  if (market === 'IL') {
    return [
      { value: 'citizen', label: '🇮🇱 Israeli Citizen', desc: 'Israeli citizen or permanent resident' },
      { value: 'permanent-resident', label: '📋 New Immigrant (Oleh)', desc: 'Recently made aliyah — may have tax benefits' },
      { value: 'temporary-resident', label: '🛂 Temporary Resident', desc: 'Living in Israel on temporary basis' },
      { value: 'foreigner', label: '🌍 Non-Resident Foreigner', desc: 'Lives outside Israel, investing remotely' },
    ];
  }
  if (market === 'US') {
    return [
      { value: 'citizen', label: '🇺🇸 US Citizen / Green Card', desc: 'US citizen or lawful permanent resident' },
      { value: 'permanent-resident', label: '📋 Visa Holder (E-2 / EB-5)', desc: 'On investor or work visa — resident for tax purposes' },
      { value: 'temporary-resident', label: '🛂 Non-Resident on Visa', desc: 'Present in the US on temporary visa' },
      { value: 'foreigner', label: '🌍 Foreign National (NRA)', desc: 'Non-resident alien — FIRPTA and withholding applies' },
    ];
  }
  return [
    { value: 'citizen', label: '🇧🇷 Brazilian Citizen', desc: 'Born in Brazil or naturalized' },
    { value: 'permanent-resident', label: '📋 Permanent Resident', desc: 'Has permanent residency in Brazil' },
    { value: 'temporary-resident', label: '🛂 Temporary Resident', desc: 'Lives in Brazil on temporary visa' },
    { value: 'foreigner', label: '🌍 Non-Resident Foreigner', desc: 'Lives outside Brazil, investing remotely' },
  ];
}

const PASSPORT_OPTIONS: { code: CountryCode | 'RO'; flag: string; name: string; isEU?: boolean }[] = [
  { code: 'IL', flag: '🇮🇱', name: 'Israeli' },
  { code: 'US', flag: '🇺🇸', name: 'American' },
  { code: 'UK', flag: '🇬🇧', name: 'British' },
  { code: 'DE', flag: '🇩🇪', name: 'German', isEU: true },
  { code: 'PT', flag: '🇵🇹', name: 'Portuguese', isEU: true },
  { code: 'ES', flag: '🇪🇸', name: 'Spanish', isEU: true },
  { code: 'RO', flag: '🇷🇴', name: 'Romanian', isEU: true },
  { code: 'AE', flag: '🇦🇪', name: 'Emirati' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazilian' },
];

const TAX_RESIDENCY_OPTIONS: { value: TaxResidencyCode; flag: string; label: string; highlight?: string }[] = [
  { value: 'IL', flag: '🇮🇱', label: 'Israel', highlight: '15% flat on foreign rental (Sec. 122A)' },
  { value: 'US', flag: '🇺🇸', label: 'United States', highlight: 'Worldwide income, FBAR required' },
  { value: 'UK', flag: '🇬🇧', label: 'United Kingdom', highlight: 'Worldwide income, self-assessment' },
  { value: 'AE', flag: '🇦🇪', label: 'UAE', highlight: 'No personal income tax ✅' },
  { value: 'RO', flag: '🇷🇴', label: 'Romania', highlight: '10% flat income tax' },
  { value: 'PT', flag: '🇵🇹', label: 'Portugal', highlight: 'NHR regime may apply' },
  { value: 'DE', flag: '🇩🇪', label: 'Germany', highlight: 'Progressive up to 45%' },
  { value: 'ES', flag: '🇪🇸', label: 'Spain', highlight: 'Beckham Law for new residents' },
  { value: 'FR', flag: '🇫🇷', label: 'France', highlight: 'Progressive up to 45%' },
  { value: 'BR', flag: '🇧🇷', label: 'Brazil (resident)', highlight: 'Only Brazilian taxes apply' },
  { value: 'OTHER', flag: '🌍', label: 'Other', highlight: '' },
];

const EU_COUNTRIES = ['DE', 'PT', 'ES', 'RO', 'FR', 'IT', 'NL', 'BE', 'AT', 'SE', 'FI', 'DK', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'EE', 'LT', 'LV', 'LU', 'MT', 'CY', 'IE', 'GR'];

export function Step1BuyerProfile({ onNext }: Props) {
  const { currentDeal, updateBuyerProfile, updateMarket } = useDealStore();
  const profile = currentDeal?.buyerProfile;
  const market = currentDeal?.property.country ?? 'BR';
  const isIsrael = market === 'IL';
  const isUSA = market === 'US';

  if (!profile) return null;

  const CITIZENSHIP_OPTIONS = getCitizenshipOptions(market);

  const toggleNationality = (code: string) => {
    const current = profile.nationalities || [];
    const isEU = EU_COUNTRIES.includes(code);
    const isRomanian = code === 'RO';

    if (current.includes(code as CountryCode)) {
      const next = current.filter((c) => c !== code);
      updateBuyerProfile({
        nationalities: next,
        isRomanianPassportHolder: isRomanian ? false : profile.isRomanianPassportHolder,
        isEUCitizen: next.some((c) => EU_COUNTRIES.includes(c)),
      });
    } else {
      const next = [...current, code as CountryCode];
      updateBuyerProfile({
        nationalities: next,
        isRomanianPassportHolder: isRomanian ? true : profile.isRomanianPassportHolder,
        isEUCitizen: isEU || profile.isEUCitizen,
      });
    }
  };

  const canProceed = profile.citizenshipStatus !== undefined && profile.taxResidency !== undefined;

  // Detect common profile: Israeli with Romanian passport
  const isIsraeliWithRomanian = profile.nationalities?.includes('IL') && profile.isRomanianPassportHolder;
  const isIsraeliTaxResident = profile.taxResidency === 'IL';
  const isUAEResident = profile.taxResidency === 'AE';

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Your Buyer Profile</h2>
        <p className="text-slate-500 mt-1">
          Affects tax rates, financing eligibility, and reporting obligations across countries.
        </p>
      </div>

      {/* Market selector */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 block">
          Which market are you investing in?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MARKET_OPTIONS.map((m) => (
            <button
              key={m.code}
              onClick={() => updateMarket(m.code)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                market === m.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-semibold text-slate-800 text-lg">{m.flag} {m.name}</div>
              <div className="text-sm text-slate-500 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
        {market === 'IL' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            🇮🇱 Israeli market: Mas Rechisha, Arnona, Track 2 rental tax, Bank of Israel-regulated mortgages.
          </div>
        )}
        {market === 'US' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            🇺🇸 US market: 30-year fixed mortgage, depreciation deduction, 1031 exchange, FIRPTA for foreign investors.
          </div>
        )}
      </div>

      {/* Market relationship */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 block">
          Your relationship with {isIsrael ? 'Israel' : isUSA ? 'the United States' : 'Brazil'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CITIZENSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateBuyerProfile({ citizenshipStatus: opt.value })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                profile.citizenshipStatus === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-medium text-slate-800">{opt.label}</div>
              <div className="text-sm text-slate-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Passports / citizenships */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 block">
          Your passport(s) / citizenships
          <span className="font-normal text-slate-400 ml-1">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PASSPORT_OPTIONS.map((nat) => {
            const selected = profile.nationalities?.includes(nat.code as CountryCode) ||
              (nat.code === 'RO' && profile.isRomanianPassportHolder);
            return (
              <button
                key={nat.code}
                onClick={() => toggleNationality(nat.code)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                {nat.flag} {nat.name}
                {nat.isEU && <span className="text-xs text-blue-400">EU</span>}
              </button>
            );
          })}
        </div>

        {/* EU passport callout */}
        {profile.isEUCitizen && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            🇪🇺 EU passport in Brazil: Does NOT reduce Brazilian taxes or ITBI.
            Benefits: EU banking, payment services (Wise, Revolut), and easier fund repatriation.
          </div>
        )}

        {/* Israeli+Romanian specific callout */}
        {isIsraeliWithRomanian && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">🇮🇱🇷🇴 Israeli citizen with Romanian passport</p>
            <p>The Romanian passport gives you EU mobility and banking benefits — but does NOT make you a Romanian tax resident.
            Unless you have relocated to Romania (183+ days/year), Israeli tax law applies to your Brazilian income.
            Tax residency is determined by where you live, not which passport you hold.</p>
          </div>
        )}
      </div>

      {/* TAX RESIDENCY — the critical question */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-slate-700 block">
            Your tax residency
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Where do you file your annual tax return and pay income tax?
            This is usually where you live, regardless of citizenship.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TAX_RESIDENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateBuyerProfile({ taxResidency: opt.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                profile.taxResidency === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-base font-medium text-slate-800">{opt.flag} {opt.label}</div>
              {opt.highlight && (
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{opt.highlight}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tax residency implications */}
      {profile.taxResidency && profile.taxResidency !== 'OTHER' && !(isUSA && profile.taxResidency === 'US') && !(isIsrael && profile.taxResidency === 'IL') && profile.taxResidency !== 'BR' && (
        <TaxResidencyImplications residency={profile.taxResidency} hasRomanian={profile.isRomanianPassportHolder} market={market} />
      )}

      {/* ITIN / SSN (US — for foreign investors) */}
      {isUSA && profile.citizenshipStatus === 'foreigner' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-amber-900">US Tax Identification Number (ITIN)</h3>
          <p className="text-sm text-amber-700">
            Foreign investors in US real estate need an ITIN (Individual Taxpayer Identification Number) to file US tax returns,
            claim treaty benefits, and receive rental income from US sources.
          </p>
          <p className="text-xs text-amber-700">
            💡 Apply via Form W-7 (with your US tax return or independently). Processing: 7-11 weeks.
            Your US CPA can often help obtain one during tax filing.
          </p>
        </div>
      )}

      {/* LLC recommendation (US) */}
      {isUSA && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-green-900">LLC Structure Recommendation</h3>
          <p className="text-sm text-green-700">
            Most US real estate investors hold property in a single-member LLC for liability protection.
            It&apos;s a pass-through entity (no double taxation) and keeps your personal assets separate from the property.
          </p>
          <p className="text-xs text-green-700">
            💡 Foreign investors: a US LLC is also required to open a US bank account and receive rental income cleanly.
            Delaware and Wyoming LLCs are popular for out-of-state/foreign investors.
          </p>
        </div>
      )}

      {/* CPF (Brazil only) */}
      {!isIsrael && !isUSA && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-amber-900">Brazilian CPF (Tax ID) — Required for all buyers</h3>
            <p className="text-sm text-amber-700 mt-1">
              All foreign buyers need a CPF to purchase property, open a bank account, and pay Brazilian taxes.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.brazilianCPF === true}
                onChange={() => updateBuyerProfile({ brazilianCPF: true })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">✅ I have a CPF</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.brazilianCPF === false}
                onChange={() => updateBuyerProfile({ brazilianCPF: false })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">❌ I need to get one</span>
            </label>
          </div>
          {!profile.brazilianCPF && (
            <p className="text-xs text-amber-700">
              💡 Apply at the Brazilian consulate in your country or at Banco do Brasil branches abroad.
              {profile.nationalities?.includes('IL') && ' In Israel: Brazilian Consulate in Tel Aviv. Process: 1-3 weeks.'}
            </p>
          )}
        </div>
      )}

      {/* US: first home / investment */}
      {isUSA && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-blue-900">Primary Residence or Investment?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Affects financing terms (owner-occupied gets better rates), capital gains exclusion ($250K single / $500K MFJ), and STR rules.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.isFirstHomeBuyer === true}
                onChange={() => updateBuyerProfile({ isFirstHomeBuyer: true })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">🏠 Primary residence</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.isFirstHomeBuyer === false}
                onChange={() => updateBuyerProfile({ isFirstHomeBuyer: false })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">📦 Investment / rental property</span>
            </label>
          </div>
          {!profile.isFirstHomeBuyer && (
            <p className="text-xs text-blue-700">
              💡 Investment properties require 20-25% down (no PMI waiver), slightly higher rates.
              Can deduct depreciation (1/27.5 of building value/year), mortgage interest, and expenses on Schedule E.
            </p>
          )}
          {profile.isFirstHomeBuyer && (
            <p className="text-xs text-blue-700">
              💡 Primary residence: up to 3-5% down (FHA/conventional). After 2+ years: $250K ($500K MFJ) capital gains exclusion on sale.
            </p>
          )}
        </div>
      )}

      {/* Israel: first-home status */}
      {isIsrael && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-blue-900">First Home Purchase (Israel)?</h3>
            <p className="text-sm text-blue-700 mt-1">
              First-time buyers pay 0% Mas Rechisha up to ₪1,978,745 — a major saving vs. the 8% investment rate.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.isFirstHomeBuyer === true}
                onChange={() => updateBuyerProfile({ isFirstHomeBuyer: true })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">✅ First home in Israel</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={profile.isFirstHomeBuyer === false}
                onChange={() => updateBuyerProfile({ isFirstHomeBuyer: false })}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">📦 Investment / additional property</span>
            </label>
          </div>
          {profile.isFirstHomeBuyer && profile.citizenshipStatus !== 'foreigner' && (
            <p className="text-xs text-blue-700">
              💡 First home exemption: 0% up to ₪1,978,745, then 3.5% up to ₪2,347,040, then standard rates.
            </p>
          )}
          {profile.citizenshipStatus === 'foreigner' && (
            <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
              ⚠️ Non-residents: standard investment rate applies (8% up to ₪5,872,725) — first-home exemption not available.
            </p>
          )}
        </div>
      )}

      {/* Purchase structure */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Purchase Structure</h3>
          <p className="text-sm text-slate-500 mt-1">
            {isIsrael
              ? 'Buying via a company in Israel generally has no tax advantage for residential rental — individual ownership is typical.'
              : isUSA
              ? 'An LLC provides liability protection with pass-through taxation — the most common structure for US rental properties.'
              : 'Buying via a Brazilian company (PJ) can significantly reduce rental income tax.'}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!profile.isCompanyPurchase}
              onChange={() => updateBuyerProfile({ isCompanyPurchase: false })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-700">
              {isIsrael || isUSA ? 'Personal (individual)' : 'Personal (CPF)'}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={profile.isCompanyPurchase}
              onChange={() => updateBuyerProfile({ isCompanyPurchase: true })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-700">
              {isIsrael ? 'Israeli Company (Ltd.)' : isUSA ? 'LLC / Corporation' : 'Brazilian Company (CNPJ)'}
            </span>
          </label>
        </div>
        {profile.isCompanyPurchase && !isIsrael && (
          <p className="text-xs text-green-700 bg-green-50 rounded p-2">
            ✅ Company (Lucro Presumido): ~11.33% effective tax on rental vs up to 27.5% personal.
            {profile.taxResidency === 'IL' && ' Note: distributions from Brazilian company to Israeli resident are taxable in Israel. Consult a cross-border CPA.'}
          </p>
        )}
        {profile.isCompanyPurchase && isIsrael && (
          <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
            ⚠️ Company purchases in Israel: 23% corporate tax + dividend withholding. For residential rental, personal ownership is usually more efficient. Consult an Israeli accountant.
          </p>
        )}
        {profile.isCompanyPurchase && isUSA && (
          <p className="text-xs text-green-700 bg-green-50 rounded p-2">
            ✅ LLC (pass-through): no double taxation. Shields personal assets. Most US investment properties are held in LLCs.
            Foreign-owned LLCs: file Form 5472 annually. Use a registered agent in the LLC&apos;s state.
          </p>
        )}
      </div>

      {/* Properties owned */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">
            {isUSA ? 'Properties in the US' : 'Properties in Brazil'}
          </label>
          <input type="number" min="0" value={profile.existingPropertiesInBrazil}
            onChange={(e) => updateBuyerProfile({ existingPropertiesInBrazil: parseInt(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Properties abroad</label>
          <input type="number" min="0" value={profile.existingPropertiesAbroad}
            onChange={(e) => updateBuyerProfile({ existingPropertiesAbroad: parseInt(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        Continue to Property Details
      </button>
    </div>
  );
}

function TaxResidencyImplications({ residency, hasRomanian, market }: { residency: TaxResidencyCode; hasRomanian: boolean; market: CountryCode }) {
  const investingInUS = market === 'US';
  const investingInIL = market === 'IL';
  const info: Record<string, { color: string; lines: string[] }> = {
    IL: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      lines: investingInUS ? [
        '📋 Israeli residents investing in the US: must report US rental income on Israeli Form 1301.',
        '💡 Section 122A option: 15% flat tax on net foreign rental income — often optimal vs. progressive rates.',
        '🔄 US taxes paid can be credited against Israeli tax via Form 1301.',
        '⚠️ Must notify Israeli Tax Authority within 30 days of acquiring foreign real estate.',
        '📊 Form 150 required if property + foreign assets exceed ₪1.9M.',
        hasRomanian ? '🇷🇴 Romanian passport does NOT affect Israeli tax obligations.' : '',
      ].filter(Boolean) : [
        '📋 Must report rental income on Israeli annual return (Form 1301).',
        '💡 Section 122A option: 15% flat tax on net foreign rental income — usually optimal.',
        '🔄 Foreign taxes paid can be credited against Israeli tax (no double taxation).',
        '⚠️ Must notify Israeli Tax Authority within 30 days of acquiring foreign real estate.',
        '📊 Form 150 required if property + other foreign assets exceed ₪1.9M.',
        hasRomanian ? '🇷🇴 Romanian passport: useful for EU banking and transfers, does NOT affect Israeli tax obligations.' : '',
      ].filter(Boolean),
    },
    US: {
      color: 'bg-red-50 border-red-200 text-red-900',
      lines: investingInUS ? [
        '✅ Investing in US real estate as a US resident — standard Schedule E reporting.',
        '📋 Depreciation (27.5yr), mortgage interest, and expenses all deductible.',
        '💡 1031 Exchange: defer capital gains by reinvesting into like-kind property within 180 days.',
        '🏦 $250K single / $500K MFJ primary residence capital gains exclusion after 2 years.',
      ] : [
        '🦅 US citizens/residents must report worldwide income (FATCA compliance).',
        '📋 Foreign rental income on Schedule E. Local tax credited on Form 1116.',
        '⚠️ FBAR required if foreign bank accounts exceed $10,000 at any point.',
        '🏦 Form 8938 (FATCA) if foreign assets exceed $50,000.',
        '💡 No Brazil-US or Israel-US comprehensive tax treaty — unilateral credit applies.',
      ],
    },
    AE: {
      color: 'bg-green-50 border-green-200 text-green-900',
      lines: [
        '✅ UAE has no personal income tax or capital gains tax.',
        '🇧🇷 Only Brazilian taxes apply: 15% IRRF withholding on rental income.',
        '📋 Ensure genuine UAE tax residency (Emirates ID + 183 days/year or primary residence certificate).',
        '💰 Most tax-efficient profile for Brazilian real estate investment.',
      ],
    },
    RO: {
      color: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      lines: [
        '📋 Romania: 10% flat income tax on worldwide rental income.',
        '🇧🇷 No Brazil-Romania tax treaty — unilateral credit for Brazilian taxes may apply.',
        '✅ Low CGT rate: 10% on property gains (after 3 years).',
        '⚠️ If you are an Israeli citizen spending significant time in Israel, verify genuine Romanian residency.',
      ],
    },
    PT: {
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      lines: [
        '🇵🇹 Portugal-Brazil Tax Treaty exists — favorable double taxation relief.',
        '🌟 NHR (Non-Habitual Resident) regime: may offer 20% flat rate for 10 years.',
        '📋 Foreign rental income taxed at 28% (or NHR rate if applicable).',
        '✅ Portugal-Brazil treaty is one of the most favorable for Brazilian investment.',
      ],
    },
    DE: {
      color: 'bg-orange-50 border-orange-200 text-orange-900',
      lines: [
        '📋 Germany-Brazil Tax Treaty exists.',
        '⚠️ High marginal rates: up to 45% + solidarity surcharge.',
        '✅ Brazilian taxes paid credited against German tax.',
        '💡 Consider structuring through German GmbH for potentially lower rates.',
      ],
    },
    UK: {
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      lines: [
        '📋 Must report Brazilian rental income on UK Self-Assessment.',
        '💡 Brazil-UK Tax Treaty: limited — mainly covers dividends and interest.',
        '⚠️ UK personal allowance (£12,570) available against foreign income.',
        '🔄 Foreign Tax Credit available for Brazilian taxes paid.',
      ],
    },
  };

  const item = info[residency];
  if (!item) return null;

  return (
    <div className={`border rounded-xl p-4 space-y-1.5 ${item.color}`}>
      <h3 className="font-semibold text-sm mb-2">Tax Obligations in Your Country of Residency</h3>
      {item.lines.map((line, i) => (
        <p key={i} className="text-xs leading-relaxed">{line}</p>
      ))}
    </div>
  );
}
