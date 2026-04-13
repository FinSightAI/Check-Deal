import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';

const RENTAL_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }; // 10/hr per IP

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), RENTAL_LIMIT);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { city, neighborhood, state, sizeSqm, rooms, propertyType, country } = await req.json();

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const isIsrael = country === 'IL';
  const currencyCode = isIsrael ? 'ILS (₪)' : 'BRL (R$)';
  const locationStr = isIsrael
    ? `${neighborhood ? `${neighborhood}, ` : ''}${city}, Israel`
    : `${neighborhood ? `${neighborhood}, ` : ''}${city}, ${state}, Brazil`;
  const marketExpert = isIsrael
    ? 'Israeli real estate expert with deep knowledge of rental markets in Tel Aviv, Jerusalem, Haifa, and all Israeli cities'
    : 'Brazilian real estate expert with deep knowledge of rental markets across all Brazilian cities and neighborhoods';
  const exampleNeighborhoods = isIsrael
    ? 'For well-known neighborhoods (Florentin, Neve Tzedek, German Colony, Rechavia, etc.) be very specific. For less-known areas, provide realistic regional estimates.'
    : 'For well-known neighborhoods (Leblon, Ipanema, Pinheiros, Vila Madalena, etc.) be very specific. For less-known areas, provide realistic regional estimates.';
  const seasonalityNote = isIsrael
    ? 'Israeli seasonality: peak Jul-Aug (summer), Apr (Passover), Sep-Oct (Jewish holidays). Low Jan-Feb, Nov.'
    : 'Brazilian seasonality varies by region.';

  const prompt = `You are a ${marketExpert}.

Provide a rental market analysis for:
- Location: ${locationStr}
- Property: ${rooms} bedroom ${propertyType}, ${sizeSqm}m²
- Currency: ${currencyCode}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "ltr": {
    "min": <monthly rent ${currencyCode} low end>,
    "median": <monthly rent ${currencyCode} most likely>,
    "max": <monthly rent ${currencyCode} high end>,
    "rentPerSqm": <${currencyCode} per m²/month>,
    "demandLevel": "high|medium|low",
    "avgDaysToRent": <days on market typically>,
    "factors": ["factor 1", "factor 2", "factor 3"]
  },
  "str": {
    "nightlyMin": <nightly rate ${currencyCode} low>,
    "nightlyMedian": <nightly rate ${currencyCode} typical>,
    "nightlyMax": <nightly rate ${currencyCode} peak>,
    "avgOccupancy": <percent 0-100>,
    "monthlyRevenue": <estimated monthly revenue ${currencyCode}>,
    "strViability": "excellent|good|moderate|poor",
    "strNotes": "brief note about STR market in this area"
  },
  "seasonality": [
    {"month": "Jan", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Feb", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Mar", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Apr", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "May", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Jun", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Jul", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Aug", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Sep", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Oct", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Nov", "ltrMultiplier": 1.0, "strMultiplier": 1.0},
    {"month": "Dec", "ltrMultiplier": 1.0, "strMultiplier": 1.0}
  ],
  "neighborhoodProfile": "<2-3 sentences about rental market in this specific area>",
  "confidence": "high|medium|low",
  "dataNote": "<brief note about data reliability for this area>"
}

Use real market knowledge. ${exampleNeighborhoods}
${seasonalityNote}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ estimate: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
