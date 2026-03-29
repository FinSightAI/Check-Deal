import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const { city, neighborhood, state, sizeSqm, rooms, propertyType, askingPrice } = await req.json();

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a Brazilian real estate market expert with deep knowledge of property prices, market trends, and comparable sales across all Brazilian cities.

Provide a real estate market analysis for:
- Location: ${neighborhood ? `${neighborhood}, ` : ''}${city}, ${state}, Brazil
- Property: ${rooms} bedroom ${propertyType}, ${sizeSqm}m²
- Asking price: R$ ${askingPrice?.toLocaleString('pt-BR') ?? 'unknown'}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "pricePerSqm": {
    "area": <avg BRL/m² for this neighborhood/area>,
    "city": <avg BRL/m² for the broader city>,
    "premium": <premium neighborhood average BRL/m²>,
    "budget": <budget area average BRL/m²>
  },
  "comparables": [
    {
      "description": "<type, size, location>",
      "price": <BRL total>,
      "pricePerSqm": <BRL/m²>,
      "daysOnMarket": <estimated days>,
      "source": "ZAP Imóveis estimate"
    }
  ],
  "marketTrend": {
    "direction": "rising|stable|falling",
    "annualAppreciation": <percent, e.g. 4.5>,
    "supplyDemand": "high-demand|balanced|oversupply",
    "liquidityScore": <1-10>,
    "avgDaysToSell": <days>,
    "priceNegotiationRoom": <typical discount percent buyers achieve, e.g. 5>
  },
  "neighborhoodProfile": {
    "description": "<2-3 sentences about this specific area>",
    "keyAmenities": ["amenity 1", "amenity 2", "amenity 3"],
    "infrastructure": "excellent|good|average|developing",
    "safety": "excellent|good|average|concerning",
    "growthPotential": "high|medium|low",
    "targetDemographic": "<who typically lives/buys here>"
  },
  "pricingAssessment": {
    "verdict": "below-market|fair|above-market|significantly-above",
    "percentVsMarket": <number, positive = above market>,
    "recommendation": "<brief buy/negotiate/pass recommendation>"
  },
  "marketOutlook": "<2-3 sentences about 1-3 year outlook for this market>",
  "confidence": "high|medium|low",
  "dataNote": "<note about data sources and reliability>"
}

Use real market knowledge. Be specific for well-known areas. Provide realistic regional estimates for less-known areas.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ marketData: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
