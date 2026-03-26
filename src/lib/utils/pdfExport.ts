import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from './formatters';

// Pure HTML/CSS PDF export — no external library needed
// Opens a print window with the deal report

export function exportDealToPDF(deal: Deal) {
  const analysis = deal.analysis;
  if (!analysis) return;

  const price = deal.property.agreedPrice || deal.property.askingPrice;
  const { returns, purchaseCosts, annualCosts, rentalAnalysis, dealScore, marketContext, financing, riskFactors } = analysis;
  const yr10 = returns.projections.find((p) => p.years === 10);
  const yr5 = returns.projections.find((p) => p.years === 5);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CheckDeal Report — ${deal.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 30px 40px; }
  h1 { font-size: 22px; color: #0f172a; }
  h2 { font-size: 14px; color: #334155; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; }
  h3 { font-size: 12px; color: #475569; margin-bottom: 6px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; }
  .logo { font-size: 18px; font-weight: 800; color: #3b82f6; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-good { background: #dcfce7; color: #166534; }
  .badge-fair { background: #fef9c3; color: #854d0e; }
  .badge-poor { background: #fee2e2; color: #991b1b; }
  .badge-excellent { background: #d1fae5; color: #065f46; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .metric { text-align: center; }
  .metric .val { font-size: 18px; font-weight: 700; color: #0f172a; }
  .metric .lbl { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .metric .sub { font-size: 10px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; text-align: left; padding: 6px 10px; font-size: 10px; color: #64748b; font-weight: 600; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  .num { text-align: right; font-weight: 500; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .blue { color: #2563eb; }
  .orange { color: #d97706; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; }
  .risk-high { color: #dc2626; font-weight: 600; }
  .risk-medium { color: #d97706; font-weight: 600; }
  .risk-low { color: #16a34a; font-weight: 600; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">CheckDeal</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Real Estate Investment Analysis</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:16px;font-weight:700">${deal.name}</div>
      <div style="color:#64748b">${deal.property.neighborhood ? deal.property.neighborhood + ', ' : ''}${deal.property.city}, ${deal.property.state} · ${deal.property.rooms}BR ${deal.property.propertyType} · ${deal.property.sizeSqm}m²</div>
      <div style="margin-top:4px">
        <span class="badge badge-${dealScore.rating}">${dealScore.total}/100 · ${dealScore.rating.toUpperCase()}</span>
        &nbsp;
        <span class="badge badge-${dealScore.recommendation === 'strong-buy' || dealScore.recommendation === 'buy' ? 'good' : dealScore.recommendation === 'hold' ? 'fair' : 'poor'}">${dealScore.recommendation.replace('-', ' ').toUpperCase()}</span>
      </div>
      <div style="font-size:9px;color:#94a3b8;margin-top:4px">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <!-- Key metrics -->
  <h2>Key Metrics</h2>
  <div class="grid-4">
    <div class="card metric">
      <div class="val blue">${formatPercent(returns.grossYield)}</div>
      <div class="lbl">Gross Yield</div>
      <div class="sub">Market avg: ~${marketContext.avgYieldArea}%</div>
    </div>
    <div class="card metric">
      <div class="val">${formatPercent(returns.netYield)}</div>
      <div class="lbl">Net Yield</div>
      <div class="sub">After all costs</div>
    </div>
    <div class="card metric">
      <div class="val">${formatPercent(returns.capRate)}</div>
      <div class="lbl">Cap Rate</div>
      <div class="sub">Real: ${formatPercent(returns.realCapRate)}</div>
    </div>
    <div class="card metric">
      <div class="val ${returns.cashOnCashReturn >= 0 ? 'green' : 'red'}">${formatPercent(returns.cashOnCashReturn)}</div>
      <div class="lbl">Cash-on-Cash Y1</div>
      <div class="sub">After mortgage</div>
    </div>
  </div>
  <div class="grid-4" style="margin-top:10px">
    <div class="card metric">
      <div class="val">${formatCurrency(price, 'BRL', true)}</div>
      <div class="lbl">Purchase Price</div>
      <div class="sub">${formatCurrency(returns.pricePerSqm, 'BRL')}/m²</div>
    </div>
    <div class="card metric">
      <div class="val">${formatCurrency(purchaseCosts.totalCashRequired, 'BRL', true)}</div>
      <div class="lbl">Total Cash Required</div>
      <div class="sub">incl. all closing costs</div>
    </div>
    <div class="card metric">
      <div class="val ${yr10 && yr10.irr >= 10 ? 'green' : 'orange'}">${yr10 ? formatPercent(yr10.irr) : '—'}</div>
      <div class="lbl">10-Year IRR</div>
      <div class="sub">Internal rate of return</div>
    </div>
    <div class="card metric">
      <div class="val">${returns.paybackYears}y</div>
      <div class="lbl">Payback Period</div>
      <div class="sub">Cash break-even</div>
    </div>
  </div>

  <!-- Property & Buyer -->
  <div class="grid-2" style="margin-top:16px">
    <div>
      <h2>Property Details</h2>
      <table>
        <tr><td>Address</td><td class="num">${deal.property.address || deal.property.city}</td></tr>
        <tr><td>Type</td><td class="num">${deal.property.propertyType}</td></tr>
        <tr><td>Size</td><td class="num">${deal.property.sizeSqm}m²</td></tr>
        <tr><td>Rooms / Bathrooms</td><td class="num">${deal.property.rooms} / ${deal.property.bathrooms}</td></tr>
        <tr><td>Condition</td><td class="num">${deal.property.condition}</td></tr>
        <tr><td>Year Built</td><td class="num">${deal.property.yearBuilt || '—'}</td></tr>
        <tr><td>Parking</td><td class="num">${deal.property.parkingSpaces}</td></tr>
        <tr><td>Condomínio/mo</td><td class="num">${deal.property.condominiumMonthly ? formatCurrency(deal.property.condominiumMonthly, 'BRL') : 'est.'}</td></tr>
        <tr><td>IPTU/yr</td><td class="num">${deal.property.iptuAnnual ? formatCurrency(deal.property.iptuAnnual, 'BRL') : 'est.'}</td></tr>
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
    </div>
  </div>

  <!-- Financing -->
  <h2>Financing</h2>
  <div class="grid-4">
    <div class="card"><div class="lbl">Type</div><div style="font-weight:600">${deal.financing.financingType === 'cash' ? 'Cash' : deal.financing.financingType}</div></div>
    <div class="card"><div class="lbl">Down Payment</div><div style="font-weight:600">${formatCurrency(deal.financing.downPaymentAmount, 'BRL', true)} (${deal.financing.downPaymentPercent.toFixed(0)}%)</div></div>
    <div class="card"><div class="lbl">Rate / Term</div><div style="font-weight:600">${deal.financing.interestRate}% · ${deal.financing.loanTermYears}y ${deal.financing.loanType}</div></div>
    <div class="card"><div class="lbl">Monthly Payment</div><div style="font-weight:600">${formatCurrency(financing.monthlyPayment, 'BRL')}</div></div>
  </div>

  <!-- Purchase Costs -->
  <h2>Purchase Cost Breakdown</h2>
  <table>
    <tr><th>Item</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Price</th></tr>
    <tr><td>Property Price</td><td class="num">${formatCurrency(purchaseCosts.propertyPrice, 'BRL')}</td><td class="num">—</td></tr>
    <tr><td>ITBI (transfer tax)</td><td class="num orange">${formatCurrency(purchaseCosts.itbi, 'BRL')}</td><td class="num orange">${((purchaseCosts.itbi / price) * 100).toFixed(1)}%</td></tr>
    <tr><td>Registration & Notary</td><td class="num">${formatCurrency(purchaseCosts.registrationFee, 'BRL')}</td><td class="num">${((purchaseCosts.registrationFee / price) * 100).toFixed(1)}%</td></tr>
    <tr><td>Legal Fees</td><td class="num">${formatCurrency(purchaseCosts.legalFees, 'BRL')}</td><td class="num">${((purchaseCosts.legalFees / price) * 100).toFixed(1)}%</td></tr>
    ${purchaseCosts.mortgageArrangementFee ? `<tr><td>Mortgage Fees</td><td class="num">${formatCurrency(purchaseCosts.mortgageArrangementFee, 'BRL')}</td><td class="num">${((purchaseCosts.mortgageArrangementFee / price) * 100).toFixed(1)}%</td></tr>` : ''}
    ${purchaseCosts.renovationBudget ? `<tr><td>Renovation</td><td class="num">${formatCurrency(purchaseCosts.renovationBudget, 'BRL')}</td><td class="num">—</td></tr>` : ''}
    <tr style="background:#f8fafc;font-weight:700"><td>Total Transaction Costs</td><td class="num blue">${formatCurrency(purchaseCosts.totalTransactionCosts, 'BRL')}</td><td class="num blue">${((purchaseCosts.totalTransactionCosts / price) * 100).toFixed(1)}%</td></tr>
    <tr style="background:#eff6ff;font-weight:700"><td>Total Cash Required</td><td class="num blue">${formatCurrency(purchaseCosts.totalCashRequired, 'BRL')}</td><td class="num">—</td></tr>
  </table>

  <!-- Rental -->
  <h2>Rental Analysis</h2>
  <table>
    <tr><th>Metric</th><th style="text-align:right">Long-Term Rental</th><th style="text-align:right">Short-Term (Airbnb)</th></tr>
    <tr><td>Gross Annual Income</td><td class="num">${formatCurrency(rentalAnalysis.ltr.grossAnnualIncome, 'BRL')}</td><td class="num">${formatCurrency(rentalAnalysis.str.grossAnnualRevenue, 'BRL')}</td></tr>
    <tr><td>Net Annual Income</td><td class="num green">${formatCurrency(rentalAnalysis.ltr.netAnnualIncome, 'BRL')}</td><td class="num green">${formatCurrency(rentalAnalysis.str.netAnnualIncome, 'BRL')}</td></tr>
    <tr><td>Gross Yield</td><td class="num">${formatPercent(rentalAnalysis.ltr.grossYield)}</td><td class="num">${formatPercent(rentalAnalysis.str.grossYield)}</td></tr>
    <tr><td>Net Yield</td><td class="num blue">${formatPercent(rentalAnalysis.ltr.netYield)}</td><td class="num blue">${formatPercent(rentalAnalysis.str.netYield)}</td></tr>
    <tr><td>Recommended Strategy</td><td class="num" colspan="2" style="text-align:right;font-weight:600">${rentalAnalysis.recommendedStrategy.replace('-', ' ')} ${rentalAnalysis.strPremiumPercent > 0 ? `(STR +${rentalAnalysis.strPremiumPercent.toFixed(0)}% net)` : ''}</td></tr>
  </table>

  <!-- 10-Year Projections -->
  <h2>Projections</h2>
  <div class="grid-3">
    ${[yr5, yr10, returns.projections.find((p) => p.years === 20)].filter(Boolean).map((proj) => `
    <div class="card">
      <h3>${proj!.years}-Year Outlook</h3>
      <table>
        <tr><td>Projected Value</td><td class="num">${formatCurrency(proj!.projectedValue, 'BRL', true)}</td></tr>
        <tr><td>Total Return</td><td class="num ${proj!.totalReturn >= 0 ? 'green' : 'red'}">${proj!.totalReturn.toFixed(0)}%</td></tr>
        <tr><td>CAGR</td><td class="num">${formatPercent(proj!.annualizedReturn)}</td></tr>
        <tr><td>IRR</td><td class="num">${formatPercent(proj!.irr)}</td></tr>
        <tr><td>Equity Built</td><td class="num">${formatCurrency(proj!.equityBuilt, 'BRL', true)}</td></tr>
      </table>
    </div>`).join('')}
  </div>

  <!-- Risk Factors -->
  <h2>Risk Factors</h2>
  <table>
    <tr><th>Severity</th><th>Risk</th><th>Category</th></tr>
    ${riskFactors.map((r) => `
    <tr>
      <td><span class="risk-${r.severity}">${r.severity.toUpperCase()}</span></td>
      <td>${r.title}: ${r.description}</td>
      <td style="color:#94a3b8">${r.category}</td>
    </tr>`).join('')}
  </table>

  <!-- Market Context -->
  <h2>Market Context (Brazil 2025)</h2>
  <div class="grid-4">
    <div class="card"><div class="lbl">Selic Rate</div><div style="font-weight:600">${marketContext.selicRate}%</div></div>
    <div class="card"><div class="lbl">IPCA Inflation</div><div style="font-weight:600">${marketContext.inflationRate}%</div></div>
    <div class="card"><div class="lbl">Real Cap Rate</div><div style="font-weight:600 ${returns.realCapRate > 0 ? ';color:#16a34a' : ';color:#dc2626'}">${formatPercent(returns.realCapRate)}</div></div>
    <div class="card"><div class="lbl">USD/BRL</div><div style="font-weight:600">R$${(1 / marketContext.exchangeRates.USD).toFixed(2)}</div></div>
  </div>

  <div class="footer">
    <p>Generated by CheckDeal on ${new Date().toISOString()}. This report is for informational purposes only and does not constitute financial, legal, or tax advice.
    Consult a licensed real estate professional, accountant (contador), and lawyer (advogado) in Brazil and your country of tax residency before making investment decisions.</p>
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
