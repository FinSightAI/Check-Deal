import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
    );
    const short = await res.text();
    if (!short.startsWith('https://tinyurl.com/')) {
      throw new Error('Invalid response');
    }
    return NextResponse.json({ short });
  } catch {
    // Fallback — return original URL
    return NextResponse.json({ short: url });
  }
}
