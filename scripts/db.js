import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env variables if running locally
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     process.env.VITE_SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Missing Supabase credentials! Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).'
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Remove any deals that have an expiration date in the past
 */
export async function cleanupExpiredDeals(supabase) {
  console.log('[Database] Checking for expired deals to clean up...');
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('deals')
    .delete()
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
    .select('id, company, title');

  if (error) {
    console.error('[Database] Error cleaning up expired deals:', error.message);
    return 0;
  }

  const count = data ? data.length : 0;
  if (count > 0) {
    console.log(`[Database] Removed ${count} expired deal(s).`);
  } else {
    console.log('[Database] No expired deals to remove.');
  }
  return count;
}

/**
 * Fetch all existing deals to ensure no duplicates are inserted
 */
export async function getExistingDealKeys(supabase) {
  const { data, error } = await supabase
    .from('deals')
    .select('company, title');

  if (error) {
    console.error('[Database] Error fetching existing deals for deduplication:', error.message);
    return new Set();
  }

  const keys = new Set();
  for (const item of (data || [])) {
    const key = `${normalize(item.company)}|${normalize(item.title)}`;
    keys.add(key);
  }
  return keys;
}

/**
 * Save new unique deals to public.deals in Supabase
 */
export async function saveDealsToDatabase(deals, supabase = getSupabaseClient()) {
  await cleanupExpiredDeals(supabase);

  const existingKeys = await getExistingDealKeys(supabase);
  console.log(`[Database] Found ${existingKeys.size} existing deals in database.`);

  const newDeals = [];
  let skippedCount = 0;

  for (const deal of deals) {
    const key = `${normalize(deal.company)}|${normalize(deal.title)}`;
    if (existingKeys.has(key)) {
      skippedCount++;
    } else {
      newDeals.push({
        company: deal.company,
        title: deal.title,
        category: deal.category,
        deal_type: deal.deal_type,
        value: deal.value,
        description: deal.description || null,
        how_to_redeem: deal.how_to_redeem || 'Verify student status with the provider.',
        duration: deal.duration || 'Active Deal',
        url: deal.url || null,
        is_new: deal.is_new ?? true,
        expires_at: deal.expires_at || null,
      });
      existingKeys.add(key); // prevent duplicates within the incoming batch itself
    }
  }

  console.log(`[Database] Filtered: ${skippedCount} existing deals skipped, ${newDeals.length} new deals to insert.`);

  if (newDeals.length === 0) {
    console.log('[Database] No new deals to insert. Database is already up to date!');
    return { inserted: 0, skipped: skippedCount };
  }

  // Insert in batches of 25
  let insertedTotal = 0;
  const batchSize = 25;
  for (let i = 0; i < newDeals.length; i += batchSize) {
    const batch = newDeals.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('deals')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`[Database] Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      insertedTotal += data ? data.length : batch.length;
    }
  }

  console.log(`[Database] Successfully inserted ${insertedTotal} new deals into Supabase!`);
  return { inserted: insertedTotal, skipped: skippedCount };
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
