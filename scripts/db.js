import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { auditAndPruneDeadDeals } from './verifier.js';

// Load .env variables if running locally
dotenv.config();

const DEFAULT_SUPABASE_URL = 'https://zwygwfcaollyotvfwumx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg';

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || 
         process.env.VITE_SUPABASE_URL || 
         DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 
         process.env.SUPABASE_SERVICE_KEY || 
         process.env.SERVICE_ROLE_KEY || 
         process.env.SUPABASE_KEY || 
         process.env.SUPABASE_ANON_KEY || 
         process.env.VITE_SUPABASE_ANON_KEY ||
         DEFAULT_SUPABASE_ANON_KEY;
}

export function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error(
      `Missing Supabase credentials! url: ${url ? 'FOUND' : 'MISSING'}, key: ${key ? 'FOUND' : 'MISSING'}.`
    );
  }
  return createClient(url, key);
}

/**
 * Remove any deals that have an expiration date in the past
 * and run link verification on deals with URLs
 */
export async function cleanupExpiredDeals(supabase) {
  console.log('[Database] Checking for expired and dead deals...');
  const nowIso = new Date().toISOString();

  // 1. Clean up explicitly expired deals
  const { data, error } = await supabase
    .from('deals')
    .delete()
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
    .select('id, company, title');

  let expiredCount = 0;
  if (error) {
    console.warn('[Database] Warning cleaning up expired deals:', error.message);
  } else {
    expiredCount = data ? data.length : 0;
    if (expiredCount > 0) {
      console.log(`[Database] Removed ${expiredCount} expired deal(s).`);
    }
  }

  // 2. Audit link health for active deals
  try {
    const auditRes = await auditAndPruneDeadDeals(supabase);
    expiredCount += auditRes.removed;
  } catch (err) {
    console.warn('[Database] Link health audit warning:', err.message);
  }

  return expiredCount;
}

/**
 * Fetch all existing deals as a Map for smart upserting
 */
export async function getExistingDealsMap(supabase) {
  const { data, error } = await supabase
    .from('deals')
    .select('id, company, title, value, description, url, latitude, longitude, address, city, category, deal_type');

  if (error) {
    console.error('[Database] Error fetching existing deals for upsert comparison:', error.message);
    return new Map();
  }

  const map = new Map();
  for (const item of (data || [])) {
    const key = `${normalize(item.company)}|${normalize(item.title)}`;
    map.set(key, item);
  }
  return map;
}

/**
 * Save new unique deals and update changed existing deals in Supabase
 */
export async function saveDealsToDatabase(deals, supabase = getSupabaseClient()) {
  await cleanupExpiredDeals(supabase);

  const existingMap = await getExistingDealsMap(supabase);
  console.log(`[Database] Found ${existingMap.size} existing deals in database.`);

  const newDeals = [];
  const dealsToUpdate = [];
  let skippedCount = 0;

  for (const deal of deals) {
    const key = `${normalize(deal.company)}|${normalize(deal.title)}`;
    const existing = existingMap.get(key);

    if (existing) {
      // Check if any attributes changed (e.g. value, description, coordinates, URL)
      const hasChanged =
        (deal.value && deal.value !== existing.value) ||
        (deal.description && deal.description !== existing.description) ||
        (deal.url && deal.url !== existing.url) ||
        (deal.latitude !== undefined && deal.latitude !== existing.latitude) ||
        (deal.longitude !== undefined && deal.longitude !== existing.longitude) ||
        (deal.address && deal.address !== existing.address) ||
        (deal.city && deal.city !== existing.city) ||
        (deal.category && deal.category !== existing.category) ||
        (deal.deal_type && deal.deal_type !== existing.deal_type);

      if (hasChanged) {
        dealsToUpdate.push({
          id: existing.id,
          company: deal.company,
          title: deal.title,
          category: deal.category || existing.category,
          deal_type: deal.deal_type || existing.deal_type,
          value: deal.value || existing.value,
          description: deal.description || existing.description,
          how_to_redeem: deal.how_to_redeem || existing.how_to_redeem,
          duration: deal.duration || existing.duration,
          url: deal.url || existing.url,
          address: deal.address || existing.address || null,
          city: deal.city || existing.city || null,
          latitude: deal.latitude ?? existing.latitude ?? null,
          longitude: deal.longitude ?? existing.longitude ?? null,
        });
      } else {
        skippedCount++;
      }
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
        address: deal.address || null,
        city: deal.city || null,
        latitude: deal.latitude || null,
        longitude: deal.longitude || null,
      });
      // Register key in map to prevent duplicate inserts within the current incoming batch
      existingMap.set(key, { id: 'pending' });
    }
  }

  console.log(`[Database] Filtered: ${skippedCount} unchanged deals, ${dealsToUpdate.length} deals to update, ${newDeals.length} new deals to insert.`);

  // 1. Perform Updates
  let updatedTotal = 0;
  for (const item of dealsToUpdate) {
    const { id, ...fields } = item;
    const { error } = await supabase
      .from('deals')
      .update(fields)
      .eq('id', id);

    if (error) {
      console.warn(`[Database] Error updating deal [${item.company}] ${item.title}:`, error.message);
    } else {
      updatedTotal++;
    }
  }

  // 2. Perform Batch Inserts
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

  console.log(`[Database] Sync Complete: ${insertedTotal} inserted, ${updatedTotal} updated, ${skippedCount} unchanged.`);
  return {
    inserted: insertedTotal,
    updated: updatedTotal,
    skipped: skippedCount,
    newDeals,
    updatedDeals: dealsToUpdate,
  };
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
