import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const { city, neighborhood, state, sizeSqm, rooms, propertyType } = await req.json();

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a Brazilian real estate expert with deep knowledge of rental markets across all Brazilian cities and neighborhoods.

Provide a rental market analysis for:
- Location: ${neighborhood ? `${neighborhood}, ` : ''}${city}, ${state}, Brazil
- Property: ${rooms} bedroom ${propertyType}, ${sizeSqm}m²

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "ltr": {
    "min": <monthly rent BRL low end>,
    "median": <monthly rent BRL most likely>,
    "max": <monthly rent BRL high end>,
    "rentPerSqm": <BRL per m²/month>,
    "demandLevel": "high|medium|low",
    "avgDaysToRent": <days on market typically>,
    "factors": ["factor 1", "factor 2", "factor 3"]
  },
  "str": {
    "nightlyMin": <nightly rate BRL low>,
    "nightlyMedian": <nightly rate BRL typical>,
    "nightlyMax": <nightly rate BRL peak>,
    "avgOccupancy": <percent 0-100>,
    "monthlyRevenue": <estimated monthly revenue BRL>,
    "strViability": "excellent|good|moderate|poor",
    "strNotes": "brief note about STR market in this area"
  },
  "seasonality": [
    {"month": "Jan", "ltrMultiplier": 1.0, "strMultiplier": 1.2},
    {"month": "Feb", "ltrMultiplier": 1.0, "strMultiplier": 1.3},
    {"month": "Mar", "ltrMultiplier": 1.0, "strMultiplier": 1.1},
    {"month": "Apr", "ltrMultiplier": 1.0, "strMultiplier": 0.9},
    {"month": "May", "ltrMultiplier": 1.0, "strMultiplier": 0.85},
    {"month": "Jun", "ltrMultiplier": 1.0, "strMultiplier": 0.8},
    {"month": "Jul", "ltrMultiplier": 1.0, "strMultiplier": 1.1},
    {"month": "Aug", "ltrMultiplier": 1.0, "strMultiplier": 0.9},
    {"month": "Sep", "ltrMultiplier": 1.0, "strMultiplier": 0.85},
    {"month": "Oct", "ltrMultiplier": 1.0, "strMultiplier": 0.9},
    {"month": "Nov", "ltrMultiplier": 1.05, "strMultiplier": 1.0},
    {"month": "Dec", "ltrMultiplier": 1.05, "strMultiplier": 1.3}
  ],
  "neighborhoodProfile": "<2-3 sentences about rental market in this specific area>",
  "confidence": "high|medium|low",
  "dataNote": "<brief note about data reliability for this area>"
}

Use real market knowledge. For well-known neighborhoods (Leblon, Ipanema, Pinheiros, Vila Madalena, etc.) be very specific. For less-known areas, provide realistic regional estimates.`;

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
