import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';

const INSIGHTS_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }; // 10/hr per IP

const SYSTEM_PROMPT = `You are a senior real estate investment analyst specializing in the Brazilian market with 20+ years of experience. You are deeply familiar with:
- Brazilian real estate law, taxes (ITBI, IPTU, IRPF/carnê-leão, GCAP), and the Receita Federal
- Brazilian financing systems (Caixa Econômica Federal, SAC vs PRICE amortization, FGTS)
- Airbnb and short-term rental market in Brazil (regulations, platforms, seasonality)
- Brazilian real estate market dynamics, regional differences, and urban development
- Investment analysis (cap rates, yields, IRR, cash flow modeling)
- Tax optimization strategies for Brazilian real estate (PJ structure, Lucro Presumido)
- Foreign investor requirements and restrictions in Brazil

You provide rigorous, data-driven analysis that is:
1. Specific to the Brazilian context
2. Honest about risks - you don't sugarcoat bad deals
3. Actionable with specific next steps
4. Aware of current market conditions (2025)

Always respond in English as the app is in English. Be concise but comprehensive. Format your response as valid JSON only — no markdown, no code fences.`;

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), INSIGHTS_LIMIT);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);
  try {
    const { deal, analysis }: { deal: Deal; analysis: DealAnalysis } = await req.json();

    if (!deal || !analysis) {
      return NextResponse.json({ error: 'Deal and analysis data required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'AI analysis not configured. Add GOOGLE_AI_API_KEY to .env.local' }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const price = deal.property.agreedPrice || deal.property.askingPrice;
    const { returns, rentalAnalysis, purchaseCosts, dealScore, riskFactors, marketContext } = analysis;

    const prompt = `Analyze this Brazilian real estate investment deal and provide insights:

## PROPERTY
- Location: ${deal.property.neighborhood}, ${deal.property.city}, ${deal.property.state}
- Type: ${deal.property.propertyType}, ${deal.property.sizeSqm}m², ${deal.property.rooms} rooms
- Condition: ${deal.property.condition}
- Purchase price: R$${price.toLocaleString('pt-BR')}
- Price/sqm: R$${returns.pricePerSqm.toFixed(0)}/m²
- Market avg: R$${marketContext.avgPricePerSqmArea.toFixed(0)}/m²
- Price vs market: ${marketContext.priceVsMarketPercent > 0 ? '+' : ''}${marketContext.priceVsMarketPercent.toFixed(1)}%

## BUYER PROFILE
- Status: ${deal.buyerProfile.citizenshipStatus}
- Has CPF: ${deal.buyerProfile.brazilianCPF}
- Company purchase: ${deal.buyerProfile.isCompanyPurchase}
- Properties in Brazil: ${deal.buyerProfile.existingPropertiesInBrazil}

## FINANCIAL METRICS
- Gross yield: ${returns.grossYield.toFixed(2)}%
- Net yield: ${returns.netYield.toFixed(2)}%
- Cap rate: ${returns.capRate.toFixed(2)}%
- Cash-on-cash return (yr1): ${returns.cashOnCashReturn.toFixed(2)}%
- Real cap rate (inflation-adjusted): ${returns.realCapRate.toFixed(2)}%
- Payback period: ${returns.paybackYears} years
- Brazil Selic rate: ${marketContext.selicRate}%
- Brazil inflation (IPCA): ${marketContext.inflationRate}%

## PURCHASE COSTS
- Property price: R$${purchaseCosts.propertyPrice.toLocaleString('pt-BR')}
- ITBI: R$${purchaseCosts.itbi.toLocaleString('pt-BR')}
- Registration: R$${purchaseCosts.registrationFee.toLocaleString('pt-BR')}
- Total transaction costs: R$${purchaseCosts.totalTransactionCosts.toLocaleString('pt-BR')} (${((purchaseCosts.totalTransactionCosts/price)*100).toFixed(1)}% of price)
- Total cash required: R$${purchaseCosts.totalCashRequired.toLocaleString('pt-BR')}

## RENTAL ANALYSIS
Long-term rental:
- Monthly rent: R$${deal.rentalAssumptions.ltr.monthlyRent.toLocaleString('pt-BR')}
- Gross yield: ${rentalAnalysis.ltr.grossYield.toFixed(2)}%
- Net income/year: R$${rentalAnalysis.ltr.netAnnualIncome.toLocaleString('pt-BR')}

Short-term rental (Airbnb):
- Avg nightly rate: R$${deal.rentalAssumptions.str.avgNightlyRate}
- Occupancy: ${deal.rentalAssumptions.str.occupancyRatePercent}%
- Gross annual revenue: R$${rentalAnalysis.str.grossAnnualRevenue.toLocaleString('pt-BR')}
- STR premium over LTR: ${rentalAnalysis.strPremiumPercent.toFixed(1)}%

## 10-YEAR PROJECTION
${returns.projections.find(p => p.years === 10) ? `
- Projected value: R$${returns.projections.find(p => p.years === 10)!.projectedValue.toLocaleString('pt-BR')}
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
  "taxAdvice": "specific Brazilian tax advice for this buyer profile and deal structure",
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
