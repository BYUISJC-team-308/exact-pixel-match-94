import { createClient } from '@supabase/supabase-js';
import { scrapeByuCalendarFood } from './scrapers/byu-calendar-food.js';
import { scrapeByuMarriottFood } from './scrapers/byu-marriott-food.js';
import { scrapeByuClubsAndTechFood } from './scrapers/byu-clubs-cs-food.js';
import { scrapeByuEngineeringFood } from './scrapers/byu-engineering-food.js';
import { validateFoodEventQuality } from './scrapers/food-event-validator.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zwygwfcaollyotvfwumx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getEventKey(ev) {
  const normTitle = (ev.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDate = ev.event_date || '';
  const normBldg = (ev.building || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normTitle}_${normDate}_${normBldg}`;
}

export async function runCampusFoodScraper() {
  console.log('====================================================');
  console.log('🍕 BYU Campus Free Food Scraper Pipeline (Feature 18)');
  console.log('Looking 3 Months Ahead (Today through 90 days)');
  console.log('====================================================\n');

  console.log('--- Calendars & Sources Being Scraped ---');
  console.log('1. BYU Events Calendar API (calendar.byu.edu) - Student Life, Health & Wellness, Arts, FHE');
  console.log('2. BYU Marriott School of Business (marriott.byu.edu/events) - Club Socials & Conferences');
  console.log('3. BYU Engineering & Computer Science (ACM, WiCS, Open Source Hack Nights)');
  console.log('4. BYU Rollins Center for Entrepreneurship (Founder Dinners & Pitch Socials)');
  console.log('5. BYUSA Student Activities (Campus Club Showcases & FHE Activities)');
  console.log('6. BYU College of Engineering Events (engineering.byu.edu/events) - Leadership Workshops & Snack & Study\n');

  const [byuCalEvents, marriottEvents, clubEvents, engEvents] = await Promise.all([
    scrapeByuCalendarFood(3).catch((e) => {
      console.error('[BYU Calendar Error]:', e.message);
      return [];
    }),
    scrapeByuMarriottFood(3).catch((e) => {
      console.error('[Marriott Scraper Error]:', e.message);
      return [];
    }),
    scrapeByuClubsAndTechFood(3).catch((e) => {
      console.error('[Club Scraper Error]:', e.message);
      return [];
    }),
    scrapeByuEngineeringFood(3).catch((e) => {
      console.error('[Engineering Scraper Error]:', e.message);
      return [];
    }),
  ]);

  const rawCombined = [...byuCalEvents, ...marriottEvents, ...clubEvents, ...engEvents];
  console.log(`\n[Aggregator] Collected ${rawCombined.length} total potential free food events across all sources.`);

  // Strict quality validation: only keep events with title, building, room number/venue, start time, and specific food type
  const highQualityEvents = [];
  let skippedCount = 0;
  for (const ev of rawCombined) {
    const quality = validateFoodEventQuality(ev);
    if (!quality.valid) {
      console.warn(`[Quality Filter] Dropped "${ev.title || 'Untitled'}": ${quality.issues.join(', ')}`);
      skippedCount++;
      continue;
    }
    highQualityEvents.push(ev);
  }
  console.log(`[Aggregator] Retained ${highQualityEvents.length} validated high-quality events (${skippedCount} dropped for missing details).`);

  const dedupedMap = new Map();
  for (const ev of highQualityEvents) {
    const key = getEventKey(ev);
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, ev);
    }
  }

  const uniqueEvents = Array.from(dedupedMap.values());
  console.log(`[Aggregator] Deduplicated down to ${uniqueEvents.length} unique campus free food events.\n`);

  const { data: existingEvents, error: fetchErr } = await supabase
    .from('food_events')
    .select('id, title, event_date, building');

  if (fetchErr) {
    console.error('[Supabase] Failed to fetch existing events:', fetchErr.message);
  }

  const existingKeys = new Set((existingEvents || []).map((e) => getEventKey(e)));

  let insertedCount = 0;
  let updatedCount = 0;

  console.log('--- Direct Push to Supabase (`food_events`) ---');
  for (const ev of uniqueEvents) {
    const key = getEventKey(ev);
    if (existingKeys.has(key)) {
      const existing = existingEvents.find((e) => getEventKey(e) === key);
      if (existing) {
        await supabase
          .from('food_events')
          .update({
            food: ev.food,
            latitude: ev.latitude,
            longitude: ev.longitude,
            details: ev.details,
            address: ev.address,
            location_note: ev.building_id || null,
          })
          .eq('id', existing.id);
        updatedCount++;
      }
    } else {
      const { error: insertErr } = await supabase.from('food_events').insert([
        {
          title: ev.title,
          host: ev.host,
          food: ev.food,
          event_date: ev.event_date,
          start_time: ev.start_time,
          end_time: ev.end_time,
          building: ev.building,
          room: ev.room,
          building_id: null,
          location_note: ev.building_id || null,
          latitude: ev.latitude,
          longitude: ev.longitude,
          details: ev.details,
          address: ev.address,
        },
      ]);

      if (insertErr) {
        console.error(`[Insert Error] "${ev.title}":`, insertErr.message);
      } else {
        console.log(`  + [Inserted] ${ev.event_date} | ${ev.title} (${ev.food}) @ ${ev.building}${ev.room ? ` (${ev.room})` : ''}`);
        insertedCount++;
      }
    }
  }

  console.log('\n====================================================');
  console.log('✅ BYU Free Food Scraper Pipeline Finished!');
  console.log(`Total Events Processed: ${uniqueEvents.length}`);
  console.log(`Newly Inserted Events:  ${insertedCount}`);
  console.log(`Updated Existing Rows:  ${updatedCount}`);
  console.log('====================================================');

  return { total: uniqueEvents.length, inserted: insertedCount, updated: updatedCount };
}

runCampusFoodScraper().catch((err) => {
  console.error('Fatal Scraper Pipeline Error:', err);
  process.exit(1);
});
