import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';


function buildSystemPrompt(market: string): string {
  const marketContext = market === 'IL'
    ? `Israeli real estate market with 20+ years of experience. You are deeply familiar with:
- Israeli real estate law and taxes: Mas Rechisha (purchase tax), Mas Shevach (capital gains), Arnona (municipal tax)
- Israeli rental income tax: Track 1 (exempt threshold), Track 2 (10% flat), Track 3 (marginal with deductions)
- Israeli mortgage system: Bank of Israel regulations, prime-linked vs fixed vs CPI-linked routes, max LTV rules
- Israeli real estate market: Tel Aviv, Jerusalem, peripheral cities, demand/supply dynamics
- Airbnb and STR regulations in Israeli cities
- Foreign buyer rules in Israel: Mas Rechisha rates, fund transfer documentation, Tabu registration
- Cross-border tax: Israeli residents owning foreign property (Section 122A, Form 1301)`
    : market === 'US'
    ? `US real estate investment market with 20+ years of experience. You are deeply familiar with:
- US real estate law: title insurance, escrow, deeds, HOA, CC&Rs, fair housing laws
- US taxes: transfer taxes (by state), property tax (by county), federal income tax on rental income, capital gains (0/15/20%), depreciation (27.5yr residential), 1031 exchange
- Foreign investor rules: FIRPTA (15% withholding at sale), ITIN, W-8ECI election, FATCA
- US mortgage products: 30/15-yr fixed, ARMs, DSCR loans, portfolio lenders, PMI
- US real estate market dynamics: major metros, cap rates, rent trends, vacancy rates
- Short-term rental (Airbnb/VRBO) platforms, regulations by city (NYC, Miami Beach, Austin, etc.)
- LLC structure for investment properties, Delaware/Wyoming vs state LLC
- State-specific rules: Florida (hurricane insurance, homestead exemption), Texas (no state income tax), New York (mansion tax, rent stabilization), California (Prop 13, rent control)`
    : `Brazilian real estate market with 20+ years of experience. You are deeply familiar with:
- Brazilian real estate law, taxes (ITBI, IPTU, IRPF/carnê-leão, GCAP), and the Receita Federal
- Brazilian financing systems (Caixa Econômica Federal, SAC vs PRICE amortization, FGTS)
- Airbnb and short-term rental market in Brazil (regulations, platforms, seasonality)
- Brazilian real estate market dynamics, regional differences, and urban development
- Tax optimization strategies for Brazilian real estate (PJ structure, Lucro Presumido)
- Foreign investor requirements and restrictions in Brazil`;

  const marketName = market === 'IL' ? 'Israeli' : market === 'US' ? 'US' : 'Brazilian';

  return `You are a senior real estate investment analyst specializing in the ${marketContext}

You also understand investment analysis fundamentals: cap rates, yields, IRR, cash flow modeling.

You provide rigorous, data-driven analysis that is:
1. Specific to the ${marketName} context
2. Honest about risks — you don't sugarcoat bad deals
3. Actionable with specific next steps
4. Aware of current market conditions (2025)

Always respond in English. Be concise but comprehensive. Format your response as valid JSON only — no markdown, no code fences.`;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req)); // 3/day free, 15/day pro, 30/day yolo
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);
  try {
    const { deal, analysis }: { deal: Deal; analysis: DealAnalysis } = await req.json();

    if (!deal || !analysis) {
      return NextResponse.json({ error: 'Deal and analysis data required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'AI analysis not configured. Add GOOGLE_AI_API_KEY to .env.local' }, { status: 503 });
    }

    const market = deal.property.country ?? 'BR';
    const currency = deal.property.currency ?? 'BRL';
    const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : 'R$';
    const isIsrael = market === 'IL';
    const isUSA = market === 'US';
    const benchmarkLabel = isIsrael ? 'Prime Rate' : isUSA ? 'Fed Rate' : 'Selic';
    const taxLabel = isIsrael ? 'Mas Rechisha' : isUSA ? 'Transfer Tax' : 'ITBI';
    const propertyTaxLabel = isIsrael ? 'Arnona (annual)' : isUSA ? 'Property Tax (annual)' : 'IPTU';

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: buildSystemPrompt(market),
    });

    const price = deal.property.agreedPrice || deal.property.askingPrice;
    const { returns, rentalAnalysis, purchaseCosts, dealScore, riskFactors, marketContext } = analysis;

    const marketName = isIsrael ? 'Israeli' : isUSA ? 'US' : 'Brazilian';
    const prompt = `Analyze this ${marketName} real estate investment deal and provide insights:

## PROPERTY
- Location: ${deal.property.neighborhood}, ${deal.property.city}${!isIsrael ? `, ${deal.property.state}` : ''}${isUSA ? ', USA' : ''}
- Type: ${deal.property.propertyType}, ${deal.property.sizeSqm}m², ${deal.property.rooms} rooms
- Condition: ${deal.property.condition}
- Purchase price: ${currencySymbol}${price.toLocaleString()}
- Price/sqm: ${currencySymbol}${returns.pricePerSqm.toFixed(0)}/m²
- Market avg: ${currencySymbol}${marketContext.avgPricePerSqmArea.toFixed(0)}/m²
- Price vs market: ${marketContext.priceVsMarketPercent > 0 ? '+' : ''}${marketContext.priceVsMarketPercent.toFixed(1)}%

## BUYER PROFILE
- Status: ${deal.buyerProfile.citizenshipStatus}
- Tax residency: ${deal.buyerProfile.taxResidency}
- Company purchase: ${deal.buyerProfile.isCompanyPurchase}
- First home: ${deal.buyerProfile.isFirstHomeBuyer}

## FINANCIAL METRICS
- Gross yield: ${returns.grossYield.toFixed(2)}%
- Net yield: ${returns.netYield.toFixed(2)}%
- Cap rate: ${returns.capRate.toFixed(2)}%
- Cash-on-cash return (yr1): ${returns.cashOnCashReturn.toFixed(2)}%
- Real cap rate (inflation-adjusted): ${returns.realCapRate.toFixed(2)}%
- Payback period: ${returns.paybackYears} years
- ${benchmarkLabel}: ${marketContext.selicRate}%
- Inflation: ${marketContext.inflationRate}%

## PURCHASE COSTS
- Property price: ${currencySymbol}${purchaseCosts.propertyPrice.toLocaleString()}
- ${taxLabel}: ${currencySymbol}${purchaseCosts.itbi.toLocaleString()}
- Registration + legal: ${currencySymbol}${purchaseCosts.registrationFee.toLocaleString()}
- Total transaction costs: ${currencySymbol}${purchaseCosts.totalTransactionCosts.toLocaleString()} (${((purchaseCosts.totalTransactionCosts/price)*100).toFixed(1)}% of price)
- Total cash required: ${currencySymbol}${purchaseCosts.totalCashRequired.toLocaleString()}

## RENTAL ANALYSIS
Long-term rental:
- Monthly rent: ${currencySymbol}${deal.rentalAssumptions.ltr.monthlyRent.toLocaleString()}
- Gross yield: ${rentalAnalysis.ltr.grossYield.toFixed(2)}%
- Net income/year: ${currencySymbol}${rentalAnalysis.ltr.netAnnualIncome.toLocaleString()}

Short-term rental (Airbnb):
- Avg nightly rate: ${currencySymbol}${deal.rentalAssumptions.str.avgNightlyRate}
- Occupancy: ${deal.rentalAssumptions.str.occupancyRatePercent}%
- Gross annual revenue: ${currencySymbol}${rentalAnalysis.str.grossAnnualRevenue.toLocaleString()}
- STR premium over LTR: ${rentalAnalysis.strPremiumPercent.toFixed(1)}%

## 10-YEAR PROJECTION
${returns.projections.find(p => p.years === 10) ? `
- Projected value: ${currencySymbol}${returns.projections.find(p => p.years === 10)!.projectedValue.toLocaleString()}
- IRR: ${returns.projections.find(p => p.years === 10)!.irr.toFixed(1)}%
- CAGR: ${returns.projections.find(p => p.years === 10)!.annualizedReturn.toFixed(1)}%` : 'Not available'}

## DEAL SCORE: ${dealScore.total}/100 (${dealScore.rating})
## RISK FACTORS: ${riskFactors.length} identified (${riskFactors.filter(r => r.severity === 'high').length} high, ${riskFactors.filter(r => r.severity === 'medium').length} medium)

Respond with this exact JSON structure (no markdown, no code fences, raw JSON only):
{
  "summary": "2-3 sentence executive summary of the deal",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "recommendation": "strong-buy|buy|hold|pass|avoid",
  "marketContext": "paragraph about the local market conditions, neighborhood, and comparable deals",
  "taxAdvice": "specific local tax advice for this buyer profile and deal structure",
  "rentalAdvice": "specific advice on the best rental strategy given the location and property type",
  "negotiationTips": ["tip 1", "tip 2"],
  "specificAdvice": ["actionable advice 1", "actionable advice 2", "actionable advice 3"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const insights = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      insights: {
        ...insights,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI analysis failed' },
      { status: 500 }
    );
  }
}
