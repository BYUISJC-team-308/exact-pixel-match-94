import { resolveBuilding } from './byu-building-resolver.js';

const FOOD_PATTERNS = /\b(food|pizza|donuts?|cookies?|lunch|dinner|refreshments?|snacks?|tacos?|treats?|ice cream|crumbl|tailgate|breakfast)\b/i;

function parseDateStringToIso(dateStr) {
  if (!dateStr) return null;
  // Examples: "7 October 2026", "9 October 2026", "11–12 September 2026", "16 October 2026"
  const clean = dateStr.replace(/&ndash;|\u2013|-/g, ' ').replace(/\s+/g, ' ').trim();
  const match = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const monthIdx = monthNames.findIndex((m) => m.startsWith(match[2].toLowerCase().slice(0, 3)));
  if (monthIdx === -1) return null;

  const month = String(monthIdx + 1).padStart(2, '0');
  const year = match[3];
  return `${year}-${month}-${day}`;
}

export async function scrapeByuMarriottFood(monthsAhead = 3) {
  console.log('[Marriott School] Scraping Marriott School business and club events...');

  try {
    const res = await fetch('https://marriott.byu.edu/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!res.ok) {
      console.warn(`[Marriott School] HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const blocks = html.split(/<hr\s*\/?>/i);
    const scraped = [];

    const now = new Date();
    const minIso = now.toISOString().split('T')[0];
    const future = new Date(now);
    future.setMonth(future.getMonth() + monthsAhead);
    const maxIso = future.toISOString().split('T')[0];

    for (const b of blocks) {
      const titleMatch = b.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/i);
      if (!titleMatch) continue;

      const title = titleMatch[1].trim();
      const dateMatch = b.match(/<b>Date:<\/b>\s*([^<]+)<br/i);
      const locMatch = b.match(/<b>Location:<\/b>\s*([^<]+)<br/i);
      const descMatch = b.match(/<div class="col-md-7"><p>([\s\S]*?)<\/p>/i);

      const rawDate = dateMatch ? dateMatch[1].trim() : '';
      const rawLoc = locMatch ? locMatch[1].trim() : 'Tanner Building';
      const cleanDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim() : '';

      const combinedText = `${title} ${cleanDesc}`.toLowerCase();
      if (!FOOD_PATTERNS.test(combinedText)) continue;

      const eventDate = parseDateStringToIso(rawDate);
      if (!eventDate) continue;

      // Filter to the 3-month window
      if (eventDate < minIso || eventDate > maxIso) continue;

      const locInfo = resolveBuilding(rawLoc.includes('Tanner') || rawLoc.includes('TNRB') ? rawLoc : `${rawLoc} TNRB`);

      let foodItem = 'Free Pizza & Refreshments';
      if (combinedText.includes('dinner')) foodItem = 'Dinner & Networking Food';
      else if (combinedText.includes('tailgate')) foodItem = 'Free Tailgate Burgers, Hot Dogs & Drinks';
      else if (combinedText.includes('cookie')) foodItem = 'Fresh Cookies & Drinks';
      else if (combinedText.includes('lunch')) foodItem = 'Lunch Provided';
      else if (combinedText.includes('breakfast')) foodItem = 'Breakfast & Snacks';

      scraped.push({
        title,
        host: 'BYU Marriott School of Business',
        food: foodItem,
        event_date: eventDate,
        start_time: '17:00:00',
        end_time: '19:00:00',
        building: locInfo.building || 'Tanner Building',
        room: locInfo.room || null,
        building_id: locInfo.building_id || 'TNRB',
        latitude: locInfo.latitude || 40.2503985,
        longitude: locInfo.longitude || -111.6523905,
        details: cleanDesc || 'Business student social and networking event with free food.',
        address: locInfo.address || 'Tanner Building, BYU Campus, Provo, UT 84602',
      });
    }

    console.log(`[Marriott School] Extracted ${scraped.length} free food events.`);
    return scraped;
  } catch (err) {
    console.warn('[Marriott School] Error scraping events:', err.message);
    return [];
  }
}
