import { resolveBuilding } from './byu-building-resolver.js';

const FOOD_PATTERNS = /\b(food|pizza|donuts?|cookies?|lunch|dinner|refreshments?|snacks?|tacos?|treats?|ice cream|crumbl|hot cocoa|pie|chick-fil-a|drinks? and food)\b/i;

function extractFoodOffer(title, desc) {
  const text = `${title} ${desc}`.toLowerCase();

  if (text.includes('pizza') && text.includes('pie')) return 'Free Pizza & Pie';
  if (text.includes('pizza')) return 'Free Pizza & Refreshments';
  if (text.includes('street taco') || text.includes('tacos')) return 'Free Street Tacos';
  if (text.includes('cookie') || text.includes('cookies')) return 'Fresh Cookies & Refreshments';
  if (text.includes('donut') || text.includes('donuts')) return 'Donuts & Drinks';
  if (text.includes('ice cream')) return 'Ice Cream & Toppings';
  if (text.includes('hot cocoa') || text.includes('hot chocolate')) return 'Hot Cocoa & Treats';
  if (text.includes('food demo') || text.includes('snack')) return 'Food Demo Samples & Healthy Snacks';
  if (text.includes('fall treat') || text.includes('treats')) return 'Fall Treats & Refreshments';
  if (text.includes('dinner is included') || text.includes('free dinner')) return 'Dinner Included';
  if (text.includes('lunch provided') || text.includes('free lunch')) return 'Free Lunch Provided';
  if (text.includes('refreshments')) return 'Free Refreshments & Drinks';

  return 'Free Campus Food & Snacks';
}

function extractHost(item) {
  const desc = item.Description || '';
  const title = item.Title || '';

  if (/student wellness/i.test(desc) || /student wellness/i.test(title)) return 'BYU Student Wellness';
  if (/office of belonging/i.test(desc) || /belonging/i.test(title)) return 'BYU Office of Belonging';
  if (/bean museum|bean life science/i.test(desc) || /bean/i.test(title)) return 'Bean Life Science Museum';
  if (/education in zion/i.test(desc) || /education in zion/i.test(title)) return 'Education in Zion Gallery';
  if (/nutrition and dietetics/i.test(desc)) return 'BYU Nutrition & Dietetics';
  if (/marriott/i.test(desc)) return 'BYU Marriott School of Business';
  if (/byusa/i.test(desc)) return 'BYUSA Student Activities';
  if (/college of engineering/i.test(desc)) return 'BYU College of Engineering';
  if (/computer science|acm/i.test(desc)) return 'BYU Computer Science';
  if (/international student/i.test(desc)) return 'BYU International Student Services';
  if (/library/i.test(desc)) return 'Harold B. Lee Library';

  return 'BYU Campus Organizations';
}

export async function scrapeByuCalendarFood(monthsAhead = 3) {
  console.log(`[BYU Calendar] Fetching campus events for next ${monthsAhead} months...`);

  const now = new Date();
  const minDate = now.toISOString().split('T')[0];
  const future = new Date(now);
  future.setMonth(future.getMonth() + monthsAhead);
  const maxDate = future.toISOString().split('T')[0];

  const params = new URLSearchParams();
  params.set('categories', 'all');
  params.set('event[min][date]', minDate);
  params.set('event[max][date]', maxDate);

  const url = `https://calendar.byu.edu/api/Events.json?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`BYU Calendar API returned HTTP ${res.status}`);
  }

  const rawEvents = await res.json();
  console.log(`[BYU Calendar] Downloaded ${rawEvents.length} university events.`);

  const scraped = [];
  for (const item of rawEvents) {
    const rawText = `${item.Title || ''} ${item.Description || ''} ${item.ShortDescription || ''}`;
    if (!FOOD_PATTERNS.test(rawText)) continue;

    // Filter out expensive galas ($20+)
    const isFreeOrSubsidized = !item.HighPrice || parseFloat(item.HighPrice) <= 15;
    if (!isFreeOrSubsidized) continue;

    const startParts = (item.StartDateTime || '').split(' ');
    const eventDate = startParts[0] || minDate;
    const startTime = startParts[1] || '12:00:00';
    const endParts = (item.EndDateTime || '').split(' ');
    const endTime = endParts[1] || '13:00:00';

    const locInfo = resolveBuilding(item.LocationName);
    const cleanDesc = (item.Description || item.ShortDescription || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();

    scraped.push({
      title: item.Title.trim(),
      host: extractHost(item),
      food: extractFoodOffer(item.Title, cleanDesc),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      building: locInfo.building,
      room: locInfo.room,
      building_id: locInfo.building_id,
      latitude: locInfo.latitude,
      longitude: locInfo.longitude,
      details: cleanDesc,
      address: locInfo.address,
    });
  }

  console.log(`[BYU Calendar] Extracted ${scraped.length} free food events on campus.`);
  return scraped;
}
