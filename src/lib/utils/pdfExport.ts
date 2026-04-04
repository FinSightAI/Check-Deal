import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from './formatters';

// Pure HTML/CSS PDF export — no external library needed
// Opens a print window with the deal report

export function exportDealToPDF(deal: Deal) {
  const analysis = deal.analysis;
  if (!analysis) return;

  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { returns, purchaseCosts, annualCosts, rentalAnalysis, dealScore, marketContext, financing, riskFactors } = analysis;
  const yr5 = returns.projections.find((p) => p.years === 5);
  const yr10 = returns.projections.find((p) => p.years === 10);
  const yr20 = returns.projections.find((p) => p.years === 20);
  const currentYear = new Date().getFullYear();

  const recBadgeClass =
    dealScore.recommendation === 'strong-buy' || dealScore.recommendation === 'buy'
      ? 'badge-good'
      : dealScore.recommendation === 'hold'
      ? 'badge-fair'
      : 'badge-poor';

  const scoreBarWidth = Math.min(100, dealScore.total);

  // Score breakdown rows (breakdown is a flat object, not array)
  const scoreBreakdownEntries = dealScore.breakdown
    ? [
        { label: 'Yield Score', score: dealScore.breakdown.yield, max: 25 },
        { label: 'Cash Flow Score', score: dealScore.breakdown.cashFlow, max: 25 },
        { label: 'Appreciation Score', score: dealScore.breakdown.appreciation, max: 20 },
        { label: 'Risk Score', score: dealScore.breakdown.risk, max: 20 },
        { label: 'Market Timing Score', score: dealScore.breakdown.marketTiming, max: 10 },
      ]
    : [];
  const scoreRows = scoreBreakdownEntries
    .map(
      (b) => `
      <tr>
        <td>${b.label}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(100, (b.score / b.max) * 100)}%;height:100%;background:${b.score / b.max >= 0.7 ? '#16a34a' : b.score / b.max >= 0.4 ? '#d97706' : '#dc2626'};border-radius:3px"></div>
            </div>
            <span style="font-weight:600;min-width:32px;text-align:right">${b.score}/${b.max}</span>
          </div>
        </td>
        <td></td>
      </tr>`
    )
    .join('');

  // Cash flow table — use YearlyCashFlow[] (cashFlows), first 10 years
  const cashFlowRows = (analysis.cashFlows || [])
    .filter((cf) => cf.year <= 10)
    .map((cf) => {
      return `
      <tr>
        <td>${currentYear + cf.year}</td>
        <td class="num">${formatCurrency(cf.propertyValue, 'BRL', true)}</td>
        <td class="num ${cf.cashFlow >= 0 ? 'green' : 'red'}">${formatCurrency(cf.cashFlow, 'BRL')}</td>
        <td class="num ${cf.cumulativeCashFlow >= 0 ? 'green' : 'red'}">${formatCurrency(cf.cumulativeCashFlow, 'BRL', true)}</td>
        <td class="num">${formatCurrency(cf.equity, 'BRL', true)}</td>
        <td class="num">${formatPercent(cf.netAfterTax / Math.max(1, cf.propertyValue) * 100)}</td>
      </tr>`;
    })
    .join('');

  // Annual costs breakdown — using AnnualCostBreakdown fields
  const annualCostItems = [
    annualCosts.condominium > 0 ? { label: 'Condomínio', val: annualCosts.condominium } : null,
    annualCosts.iptu > 0 ? { label: 'IPTU', val: annualCosts.iptu } : null,
    annualCosts.managementFee > 0 ? { label: 'Management Fee', val: annualCosts.managementFee } : null,
    annualCosts.maintenance > 0 ? { label: 'Maintenance', val: annualCosts.maintenance } : null,
    annualCosts.insurance > 0 ? { label: 'Insurance', val: annualCosts.insurance } : null,
  ].filter(Boolean) as { label: string; val: number }[];

  const notes = deal.userOverrides?.notes;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CheckDeal Report — ${deal.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }
  .page { max-width: 820px; margin: 0 auto; padding: 32px 44px; }
  h2 { font-size: 13px; color: #334155; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 1.5px solid #e2e8f0; letter-spacing: 0.02em; }
  h3 { font-size: 11px; color: #475569; margin-bottom: 6px; font-weight: 600; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 3px solid #3b82f6; }
  .logo { font-size: 20px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px; }
  .logo-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; }
  .badge-good { background: #dcfce7; color: #166534; }
  .badge-fair { background: #fef9c3; color: #854d0e; }
  .badge-poor { background: #fee2e2; color: #991b1b; }
  .badge-excellent { background: #d1fae5; color: #065f46; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .metric { text-align: center; }
  .metric .val { font-size: 17px; font-weight: 700; color: #0f172a; }
  .metric .lbl { font-size: 9px; color: #94a3b8; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .metric .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; text-align: left; padding: 6px 10px; font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-weight: 500; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .blue { color: #2563eb; }
  .orange { color: #d97706; }
  .bold { font-weight: 700; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; line-height: 1.6; }
  .risk-high { color: #dc2626; font-weight: 700; }
  .risk-medium { color: #d97706; font-weight: 700; }
  .risk-low { color: #16a34a; font-weight: 700; }
  .score-bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 4px; }
  .score-bar-fill { height: 100%; border-radius: 4px; }
  .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 10.5px; color: #475569; white-space: pre-wrap; line-height: 1.65; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 28px; }
    h2 { break-after: avoid; }
    table { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">CheckDeal</div>
      <div class="logo-sub">Real Estate Investment Analysis · Brazil</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:700;color:#0f172a">${deal.name}</div>
      <div style="color:#64748b;margin-top:2px">${deal.property.neighborhood ? deal.property.neighborhood + ', ' : ''}${deal.property.city}, ${deal.property.state}&ensp;·&ensp;${deal.property.rooms}BR ${deal.property.propertyType}&ensp;·&ensp;${deal.property.sizeSqm}m²</div>
      <div style="margin-top:5px;display:flex;gap:6px;justify-content:flex-end;align-items:center">
        <span style="font-size:20px;font-weight:800;color:${dealScore.total >= 70 ? '#16a34a' : dealScore.total >= 50 ? '#d97706' : '#dc2626'}">${dealScore.total}</span>
        <span style="font-size:11px;color:#94a3b8">/100</span>
        <span class="badge badge-${dealScore.rating}">${dealScore.rating.toUpperCase()}</span>
        <span class="badge ${recBadgeClass}">${dealScore.recommendation.replace('-', ' ').toUpperCase()}</span>
      </div>
      <!-- Score bar -->
      <div style="margin-top:6px;width:220px;margin-left:auto">
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width:${scoreBarWidth}%;background:${dealScore.total >= 70 ? '#16a34a' : dealScore.total >= 50 ? '#d97706' : '#dc2626'}"></div>
        </div>
      </div>
      <div style="font-size:9px;color:#94a3b8;margin-top:5px">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <!-- Key metrics row 1 -->
  <h2>Key Metrics</h2>
  <div class="grid-4">
    <div class="card metric">
      <div class="val blue">${formatPercent(returns.grossYield)}</div>
      <div class="lbl">Gross Yield</div>
      <div class="sub">Market avg ~${marketContext.avgYieldArea}%</div>
    </div>
    <div class="card metric">
      <div class="val">${formatPercent(returns.netYield)}</div>
      <div class="lbl">Net Yield</div>
      <div class="sub">After all operating costs</div>
    </div>
    <div class="card metric">
      <div class="val">${formatPercent(returns.capRate)}</div>
      <div class="lbl">Cap Rate</div>
      <div class="sub">Real: ${formatPercent(returns.realCapRate)}</div>
    </div>
    <div class="card metric">
      <div class="val ${returns.cashOnCashReturn >= 0 ? 'green' : 'red'}">${formatPercent(returns.cashOnCashReturn)}</div>
      <div class="lbl">Cash-on-Cash</div>
      <div class="sub">Year 1, after mortgage</div>
    </div>
  </div>
  <!-- Key metrics row 2 -->
  <div class="grid-4" style="margin-top:10px">
    <div class="card metric">
      <div class="val">${formatCurrency(price, 'BRL', true)}</div>
      <div class="lbl">Purchase Price</div>
      <div class="sub">${formatCurrency(returns.pricePerSqm, 'BRL')}/m²</div>
    </div>
    <div class="card metric">
      <div class="val">${formatCurrency(purchaseCosts.totalCashRequired, 'BRL', true)}</div>
      <div class="lbl">Total Cash In</div>
      <div class="sub">Down + all closing costs</div>
    </div>
    <div class="card metric">
      <div class="val ${yr10 && yr10.irr >= 10 ? 'green' : 'orange'}">${yr10 ? formatPercent(yr10.irr) : '—'}</div>
      <div class="lbl">10-Year IRR</div>
      <div class="sub">Internal rate of return</div>
    </div>
    <div class="card metric">
      <div class="val">${returns.paybackYears > 0 ? returns.paybackYears + 'y' : '—'}</div>
      <div class="lbl">Payback Period</div>
      <div class="sub">Cash flow break-even</div>
    </div>
  </div>

  <!-- Deal Score Breakdown -->
  ${scoreRows ? `
  <h2>Deal Score Breakdown</h2>
  <table>
    <tr><th>Category</th><th>Score</th><th>Note</th></tr>
    ${scoreRows}
    <tr style="background:#f8fafc">
      <td class="bold">Total Score</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
            <div style="width:${scoreBarWidth}%;height:100%;background:${dealScore.total >= 70 ? '#16a34a' : dealScore.total >= 50 ? '#d97706' : '#dc2626'};border-radius:3px"></div>
          </div>
          <span class="bold" style="min-width:32px;text-align:right;color:${dealScore.total >= 70 ? '#16a34a' : dealScore.total >= 50 ? '#d97706' : '#dc2626'}">${dealScore.total}/100</span>
        </div>
      </td>
      <td class="bold" style="color:${dealScore.total >= 70 ? '#16a34a' : dealScore.total >= 50 ? '#d97706' : '#dc2626'}">${dealScore.recommendation.replace('-', ' ').toUpperCase()}</td>
    </tr>
  </table>` : ''}

  <!-- Property & Buyer side-by-side -->
  <div class="grid-2" style="margin-top:16px">
    <div>
      <h2>Property Details</h2>
      <table>
        <tr><td>Address</td><td class="num">${deal.property.address || '—'}</td></tr>
        <tr><td>City / State</td><td class="num">${deal.property.city}, ${deal.property.state}</td></tr>
        <tr><td>Type</td><td class="num">${deal.property.propertyType}</td></tr>
        <tr><td>Size</td><td class="num">${deal.property.sizeSqm}m²</td></tr>
        <tr><td>Rooms / Bathrooms</td><td class="num">${deal.property.rooms} / ${deal.property.bathrooms}</td></tr>
        <tr><td>Parking</td><td class="num">${deal.property.parkingSpaces}</td></tr>
        <tr><td>Condition</td><td class="num">${deal.property.condition}</td></tr>
        <tr><td>Year Built</td><td class="num">${deal.property.yearBuilt || '—'}</td></tr>
        <tr><td>Condomínio/mo</td><td class="num">${deal.property.condominiumMonthly ? formatCurrency(deal.property.condominiumMonthly, 'BRL') : '—'}</td></tr>
        <tr><td>IPTU/yr</td><td class="num">${deal.property.iptuAnnual ? formatCurrency(deal.property.iptuAnnual, 'BRL') : '—'}</td></tr>
      </table>
    </div>
    <div>
      <h2>Buyer Profile</h2>
      <table>
        <tr><td>Brazil Status</td><td class="num">${deal.buyerProfile.citizenshipStatus}</td></tr>
        <tr><td>Tax Residency</td><td class="num">${deal.buyerProfile.taxResidency}</td></tr>
        <tr><td>Passports</td><td class="num">${deal.buyerProfile.nationalities.join(', ')}${deal.buyerProfile.isRomanianPassportHolder ? ' + RO (EU)' : ''}</td></tr>
        <tr><td>Has CPF</td><td class="num">${deal.buyerProfile.brazilianCPF ? 'Yes' : 'No — required'}</td></tr>
        <tr><td>Structure</td><td class="num">${deal.buyerProfile.isCompanyPurchase ? 'Company (PJ/CNPJ)' : 'Individual (CPF)'}</td></tr>
        <tr><td>Existing BR properties</td><td class="num">${deal.buyerProfile.existingPropertiesInBrazil}</td></tr>
      </table>
      <div style="margin-top:14px">
        <h2>Financing</h2>
        <table>
          <tr><td>Type</td><td class="num">${deal.financing.financingType === 'cash' ? 'Cash (no mortgage)' : deal.financing.financingType}</td></tr>
          ${deal.financing.financingType !== 'cash' ? `
          <tr><td>Down Payment</td><td class="num">${formatCurrency(deal.financing.downPaymentAmount, 'BRL', true)} (${deal.financing.downPaymentPercent.toFixed(0)}%)</td></tr>
          <tr><td>Loan Amount</td><td class="num">${formatCurrency(deal.financing.loanAmount, 'BRL', true)}</td></tr>
          <tr><td>Rate / Term</td><td class="num">${deal.financing.interestRate}% · ${deal.financing.loanTermYears}y ${deal.financing.loanType}</td></tr>
          <tr><td>Monthly Payment</td><td class="num bold">${formatCurrency(financing.monthlyPayment, 'BRL')}</td></tr>
          <tr><td>Total Interest Paid</td><td class="num red">${formatCurrency(financing.totalInterest, 'BRL', true)}</td></tr>
          ` : `<tr><td>Full Cash Payment</td><td class="num bold">${formatCurrency(price, 'BRL', true)}</td></tr>`}
        </table>
      </div>
    </div>
  </div>

  <!-- Purchase Cost Breakdown -->
  <h2>Purchase Cost Breakdown</h2>
  <table>
    <tr><th>Item</th><th style="text-align:right">Amount (R$)</th><th style="text-align:right">% of Price</th></tr>
    <tr><td>Property Price</td><td class="num bold">${formatCurrency(purchaseCosts.propertyPrice, 'BRL')}</td><td class="num">—</td></tr>
    <tr><td>ITBI (Transfer Tax)</td><td class="num orange">${formatCurrency(purchaseCosts.itbi, 'BRL')}</td><td class="num orange">${((purchaseCosts.itbi / price) * 100).toFixed(2)}%</td></tr>
    <tr><td>Registration & Notary (Cartório)</td><td class="num">${formatCurrency(purchaseCosts.registrationFee, 'BRL')}</td><td class="num">${((purchaseCosts.registrationFee / price) * 100).toFixed(2)}%</td></tr>
    <tr><td>Legal Fees (Advogado)</td><td class="num">${formatCurrency(purchaseCosts.legalFees, 'BRL')}</td><td class="num">${((purchaseCosts.legalFees / price) * 100).toFixed(2)}%</td></tr>
    ${purchaseCosts.mortgageArrangementFee ? `<tr><td>Mortgage Arrangement Fee</td><td class="num">${formatCurrency(purchaseCosts.mortgageArrangementFee, 'BRL')}</td><td class="num">${((purchaseCosts.mortgageArrangementFee / price) * 100).toFixed(2)}%</td></tr>` : ''}
    ${purchaseCosts.brokerCommission ? `<tr><td>Broker Commission (Corretagem)</td><td class="num">${formatCurrency(purchaseCosts.brokerCommission, 'BRL')}</td><td class="num">${((purchaseCosts.brokerCommission / price) * 100).toFixed(2)}%</td></tr>` : ''}
    ${purchaseCosts.renovationBudget ? `<tr><td>Renovation Budget</td><td class="num">${formatCurrency(purchaseCosts.renovationBudget, 'BRL')}</td><td class="num">—</td></tr>` : ''}
    <tr style="background:#f8fafc">
      <td class="bold">Total Transaction Costs</td>
      <td class="num bold blue">${formatCurrency(purchaseCosts.totalTransactionCosts, 'BRL')}</td>
      <td class="num bold blue">${((purchaseCosts.totalTransactionCosts / price) * 100).toFixed(1)}%</td>
    </tr>
    <tr style="background:#eff6ff">
      <td class="bold">Total Cash Required</td>
      <td class="num bold blue">${formatCurrency(purchaseCosts.totalCashRequired, 'BRL')}</td>
      <td class="num" style="color:#64748b">(down + costs)</td>
    </tr>
  </table>

  <!-- Annual Operating Costs -->
  ${annualCostItems.length > 0 ? `
  <h2>Annual Operating Costs</h2>
  <table>
    <tr><th>Item</th><th style="text-align:right">Annual (R$)</th><th style="text-align:right">Monthly (R$)</th></tr>
    ${annualCostItems.map(item => `
    <tr>
      <td>${item.label}</td>
      <td class="num">${formatCurrency(item.val, 'BRL')}</td>
      <td class="num" style="color:#94a3b8">${formatCurrency(item.val / 12, 'BRL')}</td>
    </tr>`).join('')}
    <tr style="background:#f8fafc">
      <td class="bold">Total Annual Costs</td>
      <td class="num bold red">${formatCurrency(annualCostItems.reduce((s, x) => s + x.val, 0), 'BRL')}</td>
      <td class="num bold red">${formatCurrency(annualCostItems.reduce((s, x) => s + x.val, 0) / 12, 'BRL')}/mo</td>
    </tr>
  </table>` : ''}

  <!-- Rental Analysis -->
  <h2>Rental Analysis</h2>
  <table>
    <tr><th>Metric</th><th style="text-align:right">Long-Term Rental (LTR)</th><th style="text-align:right">Short-Term / Airbnb (STR)</th></tr>
    <tr><td>Gross Annual Income</td><td class="num">${formatCurrency(rentalAnalysis.ltr.grossAnnualIncome, 'BRL')}</td><td class="num">${formatCurrency(rentalAnalysis.str.grossAnnualRevenue, 'BRL')}</td></tr>
    <tr><td>Net Annual Income</td><td class="num bold green">${formatCurrency(rentalAnalysis.ltr.netAnnualIncome, 'BRL')}</td><td class="num bold green">${formatCurrency(rentalAnalysis.str.netAnnualIncome, 'BRL')}</td></tr>
    <tr><td>Gross Yield</td><td class="num">${formatPercent(rentalAnalysis.ltr.grossYield)}</td><td class="num">${formatPercent(rentalAnalysis.str.grossYield)}</td></tr>
    <tr><td>Net Yield</td><td class="num bold blue">${formatPercent(rentalAnalysis.ltr.netYield)}</td><td class="num bold blue">${formatPercent(rentalAnalysis.str.netYield)}</td></tr>
    ${rentalAnalysis.str.breakEvenOccupancy ? `<tr><td>Break-even Occupancy</td><td class="num" style="color:#94a3b8">—</td><td class="num">${rentalAnalysis.str.breakEvenOccupancy.toFixed(0)}%</td></tr>` : ''}
    <tr style="background:#f0fdf4">
      <td class="bold">Recommended Strategy</td>
      <td class="num bold green" colspan="2" style="text-align:right">
        ${rentalAnalysis.recommendedStrategy.replace('-', ' ').toUpperCase()}
        ${rentalAnalysis.strPremiumPercent > 0 ? `&ensp;·&ensp;STR earns +${rentalAnalysis.strPremiumPercent.toFixed(0)}% more net` : ''}
      </td>
    </tr>
  </table>

  <!-- Cash Flow Table -->
  ${cashFlowRows ? `
  <h2>10-Year Cash Flow Projection</h2>
  <table>
    <tr>
      <th>Year</th>
      <th style="text-align:right">Property Value</th>
      <th style="text-align:right">Annual Cash Flow</th>
      <th style="text-align:right">Cumulative CF</th>
      <th style="text-align:right">Equity</th>
      <th style="text-align:right">Net Yield</th>
    </tr>
    ${cashFlowRows}
  </table>` : ''}

  <!-- 5 / 10 / 20-Year Highlights -->
  <h2>Scenario Projections</h2>
  <div class="grid-3">
    ${[yr5, yr10, yr20].filter(Boolean).map((proj) => `
    <div class="card">
      <h3>${proj!.years}-Year Outlook (${currentYear + proj!.years})</h3>
      <table>
        <tr><td>Projected Value</td><td class="num bold">${formatCurrency(proj!.projectedValue, 'BRL', true)}</td></tr>
        <tr><td>Total Return</td><td class="num bold ${proj!.totalReturn >= 0 ? 'green' : 'red'}">${proj!.totalReturn.toFixed(0)}%</td></tr>
        <tr><td>CAGR</td><td class="num">${formatPercent(proj!.annualizedReturn)}</td></tr>
        <tr><td>IRR</td><td class="num ${proj!.irr >= 10 ? 'green' : proj!.irr >= 6 ? 'orange' : 'red'}">${formatPercent(proj!.irr)}</td></tr>
        <tr><td>Equity Built</td><td class="num">${formatCurrency(proj!.equityBuilt, 'BRL', true)}</td></tr>
        <tr><td>Total Cash Flow</td><td class="num ${proj!.totalCashFlow >= 0 ? 'green' : 'red'}">${formatCurrency(proj!.totalCashFlow, 'BRL', true)}</td></tr>
      </table>
    </div>`).join('')}
  </div>

  <!-- Risk Factors -->
  <h2>Risk Factors</h2>
  <table>
    <tr><th>Severity</th><th>Risk</th><th style="text-align:right">Category</th></tr>
    ${riskFactors.map((r) => `
    <tr>
      <td><span class="risk-${r.severity}">${r.severity.toUpperCase()}</span></td>
      <td><span style="font-weight:600">${r.title}</span> — ${r.description}</td>
      <td class="num" style="color:#94a3b8">${r.category}</td>
    </tr>`).join('')}
  </table>

  <!-- Market Context -->
  <h2>Market Context (Brazil ${currentYear})</h2>
  <div class="grid-4">
    <div class="card"><div class="lbl">Selic Rate</div><div style="font-weight:600;font-size:13px">${marketContext.selicRate}%</div></div>
    <div class="card"><div class="lbl">IPCA Inflation</div><div style="font-weight:600;font-size:13px">${marketContext.inflationRate}%</div></div>
    <div class="card"><div class="lbl">Real Cap Rate</div><div style="font-weight:600;font-size:13px;color:${returns.realCapRate > 0 ? '#16a34a' : '#dc2626'}">${formatPercent(returns.realCapRate)}</div></div>
    <div class="card"><div class="lbl">USD/BRL</div><div style="font-weight:600;font-size:13px">R$${(1 / marketContext.exchangeRates.USD).toFixed(2)}</div></div>
  </div>

  ${notes ? `
  <!-- Deal Notes -->
  <h2>Deal Notes</h2>
  <div class="notes-box">${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  ` : ''}

  <div class="footer">
    <p><strong>CheckDeal</strong> · Generated ${new Date().toISOString().split('T')[0]} · ${deal.property.city}, ${deal.property.state}, Brazil</p>
    <p style="margin-top:4px">This report is for informational purposes only and does not constitute financial, legal, or tax advice.
    Always consult a licensed real estate professional (corretor CRECI), accountant (contador), and lawyer (advogado) in Brazil
    and your country of tax residency before making investment decisions. Past projections are not guarantees of future performance.</p>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
