import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const result = rateLimit(getIP(req)); // 3/day free, 15/day pro, 30/day yolo
  if (!result.allowed) return rateLimitResponse(result.resetAt);

  try {
    const { deal, analysis, messages }: {
      deal: Deal;
      analysis: DealAnalysis;
      messages: { role: 'user' | 'assistant'; content: string }[];
    } = await req.json();

    if (!process.env.GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }), { status: 503 });
    }

    const market = deal.property.country ?? 'BR';
    const isIsrael = market === 'IL';
    const isUSA = market === 'US';
    const currency = deal.property.currency ?? 'BRL';
    const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : 'R$';
    const price = deal.property.agreedPrice || deal.property.askingPrice;
    const { returns, rentalAnalysis, purchaseCosts, dealScore, marketContext } = analysis;

    const marketName = isIsrael ? 'Israeli' : isUSA ? 'US' : 'Brazilian';
    const benchmarkLabel = isIsrael ? 'Prime Rate' : isUSA ? 'Fed Rate' : 'Selic';
    const transferTaxLabel = isIsrael ? 'Mas Rechisha' : isUSA ? 'Transfer Tax' : 'ITBI';
    const propertyTaxLabel = isIsrael ? 'Arnona' : isUSA ? 'Property Tax' : 'IPTU';
    const buildingFeeLabel = isIsrael ? 'Vaad Bayit' : isUSA ? 'HOA' : 'Condo';
    const locationLine = `${deal.property.neighborhood || ''} ${deal.property.city}${!isIsrael ? `, ${deal.property.state}` : ''}${isUSA ? ', USA' : ''}`;

    const systemPrompt = `You are a senior real estate investment analyst specializing in the ${marketName} market.

DEAL CONTEXT:
- Property: ${deal.property.rooms}BR ${deal.property.propertyType}, ${deal.property.sizeSqm}m², ${locationLine}
- Price: ${currencySymbol}${price.toLocaleString()} (${currencySymbol}${returns.pricePerSqm.toFixed(0)}/m²)
- Market avg: ${currencySymbol}${marketContext.avgPricePerSqmArea.toFixed(0)}/m² | Price vs market: ${marketContext.priceVsMarketPercent > 0 ? '+' : ''}${marketContext.priceVsMarketPercent.toFixed(1)}%
- Gross yield: ${returns.grossYield.toFixed(2)}% | Net yield: ${returns.netYield.toFixed(2)}% | Cap rate: ${returns.capRate.toFixed(2)}%
- Cash-on-cash Y1: ${returns.cashOnCashReturn.toFixed(2)}%
- 10Y IRR: ${returns.projections.find(p => p.years === 10)?.irr.toFixed(1) ?? '—'}%
- Deal score: ${dealScore.total}/100 (${dealScore.rating})
- Financing: ${deal.financing.financingType === 'cash' ? 'Cash' : `${deal.financing.interestRate}%/yr ${deal.financing.loanType}, ${deal.financing.loanTermYears}y, ${deal.financing.downPaymentPercent.toFixed(0)}% down`}
- Monthly mortgage: ${currencySymbol}${analysis.financing.monthlyPayment.toLocaleString()}
- Y1 monthly cash flow: ${currencySymbol}${(analysis.cashFlows[0]?.cashFlow / 12).toFixed(0)}
- LTR monthly rent: ${currencySymbol}${deal.rentalAssumptions.ltr.monthlyRent.toLocaleString()}
- Airbnb avg nightly: ${currencySymbol}${deal.rentalAssumptions.str.avgNightlyRate} at ${deal.rentalAssumptions.str.occupancyRatePercent}% occupancy
- STR net annual: ${currencySymbol}${rentalAnalysis.str.netAnnualIncome.toLocaleString()}
- LTR net annual: ${currencySymbol}${rentalAnalysis.ltr.netAnnualIncome.toLocaleString()}
- STR premium: ${rentalAnalysis.strPremiumPercent.toFixed(1)}%
- ${transferTaxLabel}: ${currencySymbol}${purchaseCosts.itbi.toLocaleString()} | Total closing costs: ${currencySymbol}${purchaseCosts.totalTransactionCosts.toLocaleString()}
- Total cash required: ${currencySymbol}${purchaseCosts.totalCashRequired.toLocaleString()}
- ${propertyTaxLabel}: ${currencySymbol}${analysis.annualCosts.iptu.toLocaleString()}/yr | ${buildingFeeLabel}: ${currencySymbol}${analysis.annualCosts.condominium.toLocaleString()}/yr

BUYER PROFILE:
- Market status: ${deal.buyerProfile.citizenshipStatus}
- Tax residency: ${deal.buyerProfile.taxResidency}
- Passports: ${deal.buyerProfile.nationalities.join(', ')}${deal.buyerProfile.isRomanianPassportHolder ? ' + Romanian (EU)' : ''}
- First home: ${deal.buyerProfile.isFirstHomeBuyer}
- Purchase structure: ${deal.buyerProfile.isCompanyPurchase ? 'Company/LLC' : 'Individual'}

MARKET CONTEXT:
- ${benchmarkLabel}: ${marketContext.selicRate}% | Inflation: ${marketContext.inflationRate}%

Be concise and specific. Use numbers from the deal context. Respond in English.
${isUSA
  ? `For US tax questions: reference federal income tax brackets (10-37%), long-term capital gains (0/15/20%), depreciation (27.5yr residential), 1031 exchange, and FIRPTA (15% at sale for foreign sellers).
For foreign buyers: ITIN, W-8ECI election (avoids 30% gross withholding on rent), LLC structure for liability protection.
For state-specific questions: FL has no income tax, TX has no income tax, NY/CA have high state income taxes.`
  : isIsrael
  ? 'For Israeli tax questions: reference Mas Rechisha brackets, Track 2 (10% flat rental tax), Mas Shevach (25% CGT), and Bank of Israel mortgage regulations.'
  : 'For tax questions about Israeli residents: reference Section 122A (15% flat), Form 1301, and credit for Brazilian taxes paid. For Romanian passport holders with Israeli tax residency: clarify that the passport does not change tax obligations.'}`;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });

    // Build Gemini chat history (skip first assistant greeting)
    const history = messages
      .filter((m, i) => !(m.role === 'assistant' && i === 0))
      .slice(0, -1) // all but the last message
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
