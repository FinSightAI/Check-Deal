import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';

const CHAT_LIMIT = { max: 15, windowMs: 60 * 60 * 1000 }; // 15/hr per IP

export async function POST(req: NextRequest) {
  const result = rateLimit(getIP(req), CHAT_LIMIT);
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

    const price = deal.property.agreedPrice || deal.property.askingPrice;
    const { returns, rentalAnalysis, purchaseCosts, dealScore, marketContext } = analysis;

    const systemPrompt = `You are a senior real estate investment analyst specializing in the Brazilian market.

DEAL CONTEXT:
- Property: ${deal.property.rooms}BR ${deal.property.propertyType}, ${deal.property.sizeSqm}m², ${deal.property.neighborhood || ''} ${deal.property.city}, ${deal.property.state}
- Price: R$${price.toLocaleString('pt-BR')} (R$${returns.pricePerSqm.toFixed(0)}/m²)
- Market avg: R$${marketContext.avgPricePerSqmArea.toFixed(0)}/m² | Price vs market: ${marketContext.priceVsMarketPercent > 0 ? '+' : ''}${marketContext.priceVsMarketPercent.toFixed(1)}%
- Gross yield: ${returns.grossYield.toFixed(2)}% | Net yield: ${returns.netYield.toFixed(2)}% | Cap rate: ${returns.capRate.toFixed(2)}%
- Cash-on-cash Y1: ${returns.cashOnCashReturn.toFixed(2)}%
- 10Y IRR: ${returns.projections.find(p => p.years === 10)?.irr.toFixed(1) ?? '—'}%
- Deal score: ${dealScore.total}/100 (${dealScore.rating})
- Financing: ${deal.financing.financingType === 'cash' ? 'Cash' : `${deal.financing.interestRate}%/yr ${deal.financing.loanType}, ${deal.financing.loanTermYears}y, ${deal.financing.downPaymentPercent.toFixed(0)}% down`}
- Monthly mortgage payment: R$${analysis.financing.monthlyPayment.toLocaleString('pt-BR')}
- Y1 monthly cash flow: R$${(analysis.cashFlows[0]?.cashFlow / 12).toFixed(0)}
- LTR monthly rent: R$${deal.rentalAssumptions.ltr.monthlyRent.toLocaleString('pt-BR')}
- Airbnb avg nightly: R$${deal.rentalAssumptions.str.avgNightlyRate} at ${deal.rentalAssumptions.str.occupancyRatePercent}% occupancy
- STR net annual: R$${rentalAnalysis.str.netAnnualIncome.toLocaleString('pt-BR')}
- LTR net annual: R$${rentalAnalysis.ltr.netAnnualIncome.toLocaleString('pt-BR')}
- STR premium over LTR: ${rentalAnalysis.strPremiumPercent.toFixed(1)}%
- ITBI: R$${purchaseCosts.itbi.toLocaleString('pt-BR')} | Total closing costs: R$${purchaseCosts.totalTransactionCosts.toLocaleString('pt-BR')}
- Total cash required: R$${purchaseCosts.totalCashRequired.toLocaleString('pt-BR')}
- IPTU: R$${analysis.annualCosts.iptu.toLocaleString('pt-BR')}/yr | Condo: R$${analysis.annualCosts.condominium.toLocaleString('pt-BR')}/yr

BUYER PROFILE:
- Brazil status: ${deal.buyerProfile.citizenshipStatus}
- Tax residency: ${deal.buyerProfile.taxResidency}
- Passports: ${deal.buyerProfile.nationalities.join(', ')}${deal.buyerProfile.isRomanianPassportHolder ? ' + Romanian (EU)' : ''}
- Has CPF: ${deal.buyerProfile.brazilianCPF}
- Purchase structure: ${deal.buyerProfile.isCompanyPurchase ? 'Company (PJ/CNPJ)' : 'Individual (CPF)'}

MARKET CONTEXT:
- Selic rate: ${marketContext.selicRate}% | IPCA inflation: ${marketContext.inflationRate}%
- USD/BRL: ${(1 / marketContext.exchangeRates.USD).toFixed(2)}

Be concise and specific. Use numbers from the deal context. Respond in English.
For tax questions about Israeli residents: reference Section 122A (15% flat), Form 1301, and credit for Brazilian taxes paid.
For questions about Romanian passport holders with Israeli tax residency: clarify that the passport doesn't change tax obligations.`;

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
