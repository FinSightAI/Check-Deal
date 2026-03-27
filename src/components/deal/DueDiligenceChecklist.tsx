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

function getChecklist(deal: Deal): Category[] {
  const isForeigner = deal.buyerProfile.citizenshipStatus === 'foreigner';
  const isFinanced = deal.financing.financingType !== 'cash';

  return [
    {
      title: 'Property Documents',
      icon: '🏠',
      items: [
        { id: 'matricula', label: 'Matrícula atualizada (últimos 30 dias)', description: 'Full property history from Cartório de Registro de Imóveis. Confirms ownership chain and any liens.', critical: true, tip: 'Request "Certidão de Inteiro Teor" — not just the summary.' },
        { id: 'habitese', label: 'Habite-se (Auto de Conclusão)', description: 'Occupancy permit issued by the municipality. Required for legal residential use and financing.', critical: !deal.property.hasHabitese, tip: deal.property.hasHabitese ? 'Property has Habite-se ✓' : '⚠️ Property listed without Habite-se — investigate urgently.' },
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
          {!deal.buyerProfile.brazilianCPF && (
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
        This checklist is a guide, not legal advice. Always work with a licensed Brazilian real estate attorney (advogado).
      </p>
    </div>
  );
}
