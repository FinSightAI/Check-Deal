import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Strip HTML tags, scripts, styles — keep meaningful text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 6000); // Limit context to avoid token overflow

    return text;
  } catch {
    return null;
  }
}

const EXTRACTION_PROMPT = `You are a Brazilian real estate data extraction assistant.

Extract property listing information from the text below and return a JSON object.

Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "address": string or null,
  "city": string or null,
  "neighborhood": string or null,
  "state": string (2-letter BR state code, e.g. "SP", "RJ") or null,
  "propertyType": "apartment" | "house" | "studio" | "condo" | "commercial" | "land" or null,
  "askingPrice": number (in BRL, no currency symbols) or null,
  "sizeSqm": number (total area in m², use área útil if available) or null,
  "rooms": number (bedrooms / quartos) or null,
  "bathrooms": number or null,
  "parkingSpaces": number (vagas) or null,
  "floor": number or null,
  "totalFloors": number or null,
  "yearBuilt": number or null,
  "condition": "new" | "excellent" | "good" | "needs-work" | "renovation" or null,
  "isNewDevelopment": boolean,
  "hasHabitese": boolean,
  "condominiumMonthly": number (condomínio in BRL) or null,
  "iptuAnnual": number (IPTU annual in BRL, convert monthly×12 if needed) or null,
  "dealName": string (short descriptive name like "2BR Pinheiros SP" for the deal)
}

Rules:
- If price is shown as "R$ 850.000" → 850000
- If price is shown as "R$ 1,2 mi" or "R$ 1.2 milhão" → 1200000
- For state: infer from city if not explicit (São Paulo = SP, Rio de Janeiro = RJ, etc.)
- For condition: infer from description ("novo", "reformado" → excellent; "precisando reforma" → renovation)
- isNewDevelopment: true if "lançamento", "planta", "na planta", "empreendimento novo"
- hasHabitese: true unless it's off-plan/na planta

Return ONLY the JSON object, no explanation.

LISTING TEXT:
`;

export async function POST(req: NextRequest) {
  try {
    const { url, text } = await req.json();

    if (!url && !text) {
      return NextResponse.json({ error: 'Provide url or text' }, { status: 400 });
    }

    let listingText = text ?? '';
    let source: 'url' | 'text' | 'url-fallback' = text ? 'text' : 'url';

    if (url && !text) {
      const fetched = await fetchPageText(url);
      if (fetched && fetched.length > 200) {
        listingText = fetched;
        source = 'url';
      } else {
        // URL fetch failed — return error so frontend can ask user to paste text
        return NextResponse.json({
          success: false,
          source: 'url-failed',
          error: 'Could not fetch listing page. Please paste the listing text below.',
        });
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(EXTRACTION_PROMPT + listingText);
    const raw = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Could not parse listing data' });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, source, data: parsed });
  } catch (err) {
    console.error('parse-listing error:', err);
    return NextResponse.json({ success: false, error: 'Extraction failed' }, { status: 500 });
  }
}
