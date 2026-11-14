import { resolveBuilding, extractRoom } from './byu-building-resolver.js';
import { validateFoodEventQuality } from './food-event-validator.js';

function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const FOOD_PATTERNS = /\b(pizza|nuggets?|chick-fil-a|costa vida|tacos?|donuts?|doughnuts?|cookies?|pie|bagels?|parfaits?|popcorn|charcuterie|muffins?|cereal|chips and salsa|trail mix|jerky|cottage cheese|refreshments?|lunch|dinner|breakfast|food)\b/i;

function extractFoodOffer(title, desc) {
  const text = `${title} ${desc}`.toLowerCase();
  if (/two jack'?s pizza|pizza/i.test(text)) return "Two Jack's Pizza & Refreshments";
  if (/chick-fil-a/i.test(text)) return 'Chick-fil-A Nuggets & Refreshments';
  if (/costa vida/i.test(text)) return 'Costa Vida Burritos & Refreshments';
  if (/pie/i.test(text)) return 'Fresh Pie & Refreshments';
  if (/bagels?/i.test(text)) return 'Bagels & Cream Cheese';
  if (/parfaits?/i.test(text)) return 'Yogurt & Fruit Parfaits';
  if (/pop ?tarts?|popcorn/i.test(text)) return 'Popcorn & Pop-Tarts';
  if (/charcuterie/i.test(text)) return 'Charcuterie Board & Snacks';
  if (/muffins?/i.test(text)) return 'Fresh Muffins & Milk';
  if (/chips and salsa/i.test(text)) return 'Chips & Salsa';
  if (/cereal/i.test(text)) return 'Cereal Bar & Milk';
  if (/jerky|trail mix/i.test(text)) return 'Jerky & Trail Mix';
  if (/cottage cheese/i.test(text)) return 'Cottage Cheese & Fresh Fruit';
  if (/doughnuts?|donuts?/i.test(text)) return 'Fresh Doughnuts & Drinks';
  if (/cookies?/i.test(text)) return 'Fresh Cookies & Drinks';
  if (/tacos?/i.test(text)) return 'Free Street Tacos';
  if (/lunch/i.test(text)) return 'Free Catered Lunch';
  if (/dinner/i.test(text)) return 'Free Catered Dinner';
  if (/refreshments?/i.test(text)) return 'Free Refreshments & Snacks';
  return null;
}

function parseDateTimeString(str) {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const dateMatch = str.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
  if (!dateMatch) return null;

  const monthIdx = months.indexOf(dateMatch[1].toLowerCase());
  const day = parseInt(dateMatch[2], 10);
  const now = new Date();
  let year = now.getFullYear();
  // If the event month is earlier in the year than the current month, it's next calendar year
  if (monthIdx < now.getMonth()) {
    year += 1;
  }
  const eventDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let startTime = '12:00:00';
  let endTime = '13:00:00';

  if (timeMatch) {
    let sh = parseInt(timeMatch[1], 10);
    const sm = timeMatch[2];
    const sp = timeMatch[3].toUpperCase();
    if (sp === 'PM' && sh < 12) sh += 12;
    if (sp === 'AM' && sh === 12) sh = 0;
    startTime = `${String(sh).padStart(2, '0')}:${sm}:00`;

    let eh = parseInt(timeMatch[4], 10);
    const em = timeMatch[5];
    const ep = timeMatch[6].toUpperCase();
    if (ep === 'PM' && eh < 12) eh += 12;
    if (ep === 'AM' && eh === 12) eh = 0;
    endTime = `${String(eh).padStart(2, '0')}:${em}:00`;
  }

  return { eventDate, startTime, endTime };
}

export async function scrapeByuEngineeringFood(monthsAhead = 3) {
  console.log('[Engineering Scraper] Scraping BYU College of Engineering events...');

  const now = new Date();
  const minDate = now.toISOString().split('T')[0];
  const future = new Date(now);
  future.setMonth(future.getMonth() + monthsAhead);
  const maxDate = future.toISOString().split('T')[0];

  let html = '';
  try {
    const res = await fetch('https://engineering.byu.edu/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!res.ok) {
      console.warn(`[Engineering Scraper] HTTP ${res.status}`);
      return [];
    }
    html = await res.text();
  } catch (err) {
    console.error('[Engineering Scraper] Fetch error:', err.message);
    return [];
  }

  const trs = html.split(/<tr[^>]*>/i);
  const scraped = [];
  let skippedQualityCount = 0;

  for (let i = 1; i < trs.length; i++) {
    const tr = trs[i].split(/<\/tr>/i)[0];
    const tds = tr.split(/<td[^>]*>/i);
    if (tds.length < 5) continue;

    const rawDateTime = cleanText(tds[1]);
    const rawTitle = cleanText(tds[2]);
    const rawLocation = cleanText(tds[3]);
    const rawDesc = cleanText(tds[4]);

    const combinedText = `${rawTitle} ${rawDesc}`;
    if (!FOOD_PATTERNS.test(combinedText)) continue;

    const dt = parseDateTimeString(rawDateTime);
    if (!dt) continue;

    // Filter within the date window
    if (dt.eventDate < minDate || dt.eventDate > maxDate) continue;

    const locInfo = resolveBuilding(rawLocation);
    // Explicit room designation
    const room = locInfo.room || extractRoom(rawLocation) || rawLocation;
    const food = extractFoodOffer(rawTitle, rawDesc);

    const eventCandidate = {
      title: rawTitle,
      host: 'BYU College of Engineering',
      food: food || 'Free Food & Refreshments',
      event_date: dt.eventDate,
      start_time: dt.startTime,
      end_time: dt.endTime,
      building: locInfo.building,
      room: room,
      building_id: locInfo.building_id || 'EB',
      latitude: locInfo.latitude || 40.2478,
      longitude: locInfo.longitude || -111.6475,
      address: locInfo.address || 'Engineering Building, BYU Campus, Provo, UT 84602',
      details: rawDesc,
    };

    // Strict validation: must have title, building, room number/venue, start time, and specific food type
    const quality = validateFoodEventQuality(eventCandidate);
    if (!quality.valid) {
      console.log(`  - [Skipped - Incomplete Info] "${rawTitle}": ${quality.issues.join(', ')}`);
      skippedQualityCount++;
      continue;
    }

    scraped.push(eventCandidate);
  }

  console.log(`[Engineering Scraper] Found ${scraped.length} validated free food events (${skippedQualityCount} skipped for missing details).`);
  return scraped;
}
