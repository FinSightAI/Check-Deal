import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rateLimit';

const PARSE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }; // 10/hr per IP

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he,pt-BR,pt;q=0.9,en;q=0.8',
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

const EXTRACTION_PROMPT = `You are a real estate data extraction assistant supporting Brazilian, Israeli, and US property listings.

First detect which market this listing is from:
- Israeli listing: Hebrew text, ₪ prices, yad2.co.il / madlan.co.il URLs, cities like Tel Aviv/Jerusalem/Haifa/Eilat
- Brazilian listing: Portuguese text, R$ prices, zapimoveis.com.br / vivareal.com / imovelweb.com.br URLs, Brazilian cities/states
- US listing: English text, $ prices, zillow.com / realtor.com / redfin.com URLs, US cities and state codes (FL, TX, NY, CA, etc.)

Extract property listing information and return a JSON object.

Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "country": "BR" | "IL" | "US",
  "address": string or null,
  "city": string or null,
  "neighborhood": string or null,
  "state": string or null (2-letter state code: BR state like "SP", or US state like "FL", "TX", "NY"; null for Israel),
  "propertyType": "apartment" | "house" | "studio" | "condo" | "commercial" | "land" or null,
  "askingPrice": number (numeric value only, no currency symbols) or null,
  "currency": "BRL" | "ILS" | "USD",
  "sizeSqm": number (total area in m²; convert sqft to m² by dividing by 10.764) or null,
  "rooms": number (bedrooms) or null,
  "bathrooms": number or null,
  "parkingSpaces": number or null,
  "floor": number or null,
  "totalFloors": number or null,
  "yearBuilt": number or null,
  "condition": "new" | "excellent" | "good" | "needs-work" | "renovation" or null,
  "isNewDevelopment": boolean,
  "hasHabitese": boolean,
  "condominiumMonthly": number or null (HOA fee for US, condominium for BR/IL),
  "iptuAnnual": number or null (property tax annual for US/BR; null for Israel),
  "arnona": number or null (monthly Arnona in ₪, Israel only),
  "vaadBayit": number or null (monthly building maintenance in ₪, Israel only),
  "dealName": string (short descriptive name, e.g. "3BR Miami Brickell" or "2BR Tel Aviv Florentin" or "3BR Pinheiros SP")
}

Brazilian rules:
- Price "R$ 850.000" → 850000; "R$ 1,2 mi" → 1200000
- state: infer from city (São Paulo=SP, Rio de Janeiro=RJ, Belo Horizonte=MG, etc.)
- isNewDevelopment: true if "lançamento", "planta", "na planta"
- hasHabitese: true unless off-plan

Israeli rules:
- Price "₪2,500,000" or "2.5 מיליון" → 2500000
- Hebrew room counts: חדרים (rooms), חדר שינה (bedroom), שירותים (bathrooms), חניה (parking)
- condition: "חדש" / "משופץ" → excellent; "דורש שיפוץ" → renovation
- isNewDevelopment: true if "פרויקט חדש", "דירה חדשה מקבלן", "על הנייר"
- hasHabitese: always false for Israel (Tofes 4 is the Israeli equivalent — not the same field)
- arnona: extract monthly arnona amount if mentioned
- vaadBayit: extract monthly ועד בית amount if mentioned
- city: return in English (Tel Aviv, Jerusalem, Haifa, etc.) even if text is Hebrew

US rules:
- Price "$450,000" or "450K" → 450000; "$1.2M" → 1200000
- sizeSqm: convert sqft to m² (divide by 10.764). "1,200 sqft" → 111 m²
- state: use 2-letter code (FL, TX, NY, CA, etc.) — infer from city if not stated
- HOA: extract monthly HOA fee into condominiumMonthly
- Property tax: extract annual property tax into iptuAnnual if mentioned
- isNewDevelopment: true if "new construction", "pre-construction", "builder sale"
- hasHabitese: always false for US
- condition: "move-in ready" / "turnkey" → excellent; "fixer-upper" / "as-is" → renovation

Return ONLY the JSON object, no explanation.

LISTING TEXT:
`;

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), PARSE_LIMIT);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

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
