'use client';

import { useDealStore } from '@/lib/store/dealStore';
import { CitizenshipStatus, CountryCode, TaxResidencyCode } from '@/lib/types/deal';

interface Props {
  onNext: () => void;
}

const CITIZENSHIP_OPTIONS: { value: CitizenshipStatus; label: string; desc: string }[] = [
  { value: 'citizen', label: '🇧🇷 Brazilian Citizen', desc: 'Born in Brazil or naturalized' },
  { value: 'permanent-resident', label: '📋 Permanent Resident', desc: 'Has permanent residency in Brazil' },
  { value: 'temporary-resident', label: '🛂 Temporary Resident', desc: 'Lives in Brazil on temporary visa' },
  { value: 'foreigner', label: '🌍 Non-Resident Foreigner', desc: 'Lives outside Brazil, investing remotely' },
];

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
  const { currentDeal, updateBuyerProfile } = useDealStore();
  const profile = currentDeal?.buyerProfile;

  if (!profile) return null;

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

      {/* Brazil relationship */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 block">
          Your relationship with Brazil
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
      {profile.taxResidency && profile.taxResidency !== 'BR' && profile.taxResidency !== 'OTHER' && (
        <TaxResidencyImplications residency={profile.taxResidency} hasRomanian={profile.isRomanianPassportHolder} />
      )}

      {/* CPF */}
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
            {profile.nationalities?.includes('IL') && ' In Israel: Brazilian Consulate in Tel Aviv, Rua Kaufmann area. Process: 1-3 weeks.'}
          </p>
        )}
      </div>

      {/* Purchase structure */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Purchase Structure</h3>
          <p className="text-sm text-slate-500 mt-1">
            Buying via a Brazilian company (PJ) can significantly reduce rental income tax.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!profile.isCompanyPurchase}
              onChange={() => updateBuyerProfile({ isCompanyPurchase: false })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-700">Personal (CPF)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={profile.isCompanyPurchase}
              onChange={() => updateBuyerProfile({ isCompanyPurchase: true })}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-700">Brazilian Company (CNPJ)</span>
          </label>
        </div>
        {profile.isCompanyPurchase && (
          <p className="text-xs text-green-700 bg-green-50 rounded p-2">
            ✅ Company (Lucro Presumido): ~11.33% effective tax on rental vs up to 27.5% personal.
            {profile.taxResidency === 'IL' && ' Note: distributions from Brazilian company to Israeli resident are taxable in Israel. Consult a cross-border CPA.'}
          </p>
        )}
      </div>

      {/* Properties owned */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Properties in Brazil</label>
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

function TaxResidencyImplications({ residency, hasRomanian }: { residency: TaxResidencyCode; hasRomanian: boolean }) {
  const info: Record<string, { color: string; lines: string[] }> = {
    IL: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      lines: [
        '📋 Must report Brazilian rental income on Israeli annual return (Form 1301).',
        '💡 Section 122A option: 15% flat tax on net foreign rental income — usually optimal.',
        '🔄 Brazilian taxes paid can be credited against Israeli tax (no double taxation).',
        '⚠️ Must notify Israeli Tax Authority within 30 days of acquiring foreign real estate.',
        '📊 Form 150 required if property + other foreign assets exceed ₪1.9M (~R$2.4M).',
        hasRomanian ? '🇷🇴 Romanian passport: useful for EU banking and transfers, does NOT affect Israeli tax obligations.' : '',
      ].filter(Boolean),
    },
    US: {
      color: 'bg-red-50 border-red-200 text-red-900',
      lines: [
        '🦅 US citizens/residents must report worldwide income (FATCA compliance).',
        '📋 Foreign rental income on Schedule E. Brazilian tax credited on Form 1116.',
        '⚠️ FBAR required if Brazilian bank accounts exceed $10,000 at any point.',
        '🏦 Form 8938 (FATCA) if foreign assets exceed $50,000.',
        '💡 No Brazil-US tax treaty — unilateral credit applies.',
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
