#!/usr/bin/env node
import dotenv from 'dotenv';
import { getSupabaseClient } from './db.js';
import { classifyDeal } from './classify.js';

dotenv.config();

async function reclassifyDatabase() {
  console.log('🔄 Starting Database Reclassification & Deal Description Enrichment...');
  const sb = getSupabaseClient();

  const { data: deals, error } = await sb
    .from('deals')
    .select('id, company, title, category, deal_type, description, value, url');

  if (error) {
    console.error('❌ Failed to fetch deals from database:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${deals.length} deals in database.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const deal of deals) {
    // Force reclassification with our company catalog & improved regexes
    const classified = await classifyDeal({
      ...deal,
      category: undefined, // Clear existing category to recalculate accurately
      deal_type: undefined,
    });

    const categoryChanged = classified.category !== deal.category;
    const descChanged = classified.description !== deal.description;
    const typeChanged = classified.deal_type !== deal.deal_type;

    if (categoryChanged || descChanged || typeChanged) {
      const { error: updateErr } = await sb
        .from('deals')
        .update({
          category: classified.category,
          deal_type: classified.deal_type,
          description: classified.description,
        })
        .eq('id', deal.id);

      if (updateErr) {
        console.error(`❌ Failed to update deal ${deal.company}:`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`[Updated] ${deal.company}:`);
        if (categoryChanged) console.log(`   - Category: "${deal.category}" -> "${classified.category}"`);
        if (descChanged) console.log(`   - Description: "${classified.description.slice(0, 80)}..."`);
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n====================================================');
  console.log(`✅ Reclassification Complete!`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Unchanged: ${skippedCount}`);
  console.log('====================================================\n');

  // Verify AI deals
  console.log('🤖 Verifying deals currently in category "AI":');
  const { data: aiDeals } = await sb
    .from('deals')
    .select('company, title, category, description')
    .eq('category', 'AI');

  console.log(aiDeals);

  // Verify Red Wing, Saatva, Leesa, GlassesUSA
  console.log('\n🔎 Verifying Red Wing, Saatva, Leesa, GlassesUSA.com, FIGS:');
  const { data: sampleDeals } = await sb
    .from('deals')
    .select('company, title, category, description')
    .or('company.ilike.%red wing%,company.ilike.%saatva%,company.ilike.%leesa%,company.ilike.%glassesusa%,company.ilike.%figs%');

  console.log(sampleDeals);
}

reclassifyDatabase().catch(console.error);
