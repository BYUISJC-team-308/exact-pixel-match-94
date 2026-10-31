#!/usr/bin/env node
import dotenv from 'dotenv';
import { scrapeIdMe } from './scrapers/idme.js';
import { scrapeTechAndAiDeals } from './scrapers/tech-and-ai.js';
import { scrapeByuProvoDeals } from './scrapers/byu-provo.js';
import { classifyBatch } from './classify.js';
import { saveDealsToDatabase, getSupabaseUrl, getSupabaseKey } from './db.js';

dotenv.config();

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting StudEats Automated Student Deals Scraper');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  console.log('[Runner] Environment configuration:');
  console.log(`   - Supabase URL: ${getSupabaseUrl()}`);
  console.log(`   - Supabase Key: ${getSupabaseKey() ? 'Configured (' + getSupabaseKey().length + ' chars)' : 'MISSING'}`);
  console.log(`   - Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not set (using heuristic classifier)'}`);
  console.log('');

  try {
    // 1. Run all scrapers in parallel
    console.log('[Runner] Launching scrapers in parallel...');
    const [idMeDeals, techAiDeals, localDeals] = await Promise.all([
      scrapeIdMe().catch(err => {
        console.error('[Runner] ID.me scraper error:', err.message);
        return [];
      }),
      scrapeTechAndAiDeals().catch(err => {
        console.error('[Runner] Tech & AI scraper error:', err.message);
        return [];
      }),
      scrapeByuProvoDeals().catch(err => {
        console.error('[Runner] Local BYU & Provo scraper error:', err.message);
        return [];
      })
    ]);

    const allRawDeals = [...techAiDeals, ...idMeDeals, ...localDeals];
    console.log(`\n📦 Total raw deals gathered from all sources: ${allRawDeals.length}`);

    if (allRawDeals.length === 0) {
      console.warn('⚠️ No deals were gathered. Exiting.');
      return;
    }

    // 2. Classify deals (Gemini if key is available, else heuristic rules)
    console.log('\n🧠 Classifying and standardizing deals...');
    const classifiedDeals = await classifyBatch(allRawDeals);

    // 3. Sync to Supabase with deduplication and expired deal cleanup
    console.log('\n💾 Syncing deals to Supabase database...');
    const result = await saveDealsToDatabase(classifiedDeals);

    console.log('\n====================================================');
    console.log('✅ Scraper Run Completed Successfully!');
    console.log(`   - New deals inserted: ${result.inserted}`);
    console.log(`   - Existing deals skipped: ${result.skipped}`);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Fatal error in scraper pipeline:', err);
    process.exit(1);
  }
}

main();
