/**
 * Hybrid Deal Classifier
 * Uses Google Gemini 1.5 Flash in smart batches of 15 when GEMINI_API_KEY is available,
 * with an intelligent rule-based engine and company catalog as a reliable instant fallback.
 */

import { getCompanyCatalogEntry, buildEnrichedDescription } from './company-catalog.js';

const VALID_CATEGORIES = ['Food', 'Tech', 'AI', 'Subscription', 'Groceries', 'Print', 'Fitness', 'Travel'];
const VALID_DEAL_TYPES = ['Percent off', 'Free', 'Fixed price'];

export function classifyDealType(deal) {
  const text = `${deal.value || ''} ${deal.title || ''} ${deal.description || ''}`.toLowerCase();
  if (/free|100% off|\$0|\$0\.00|trial|credits/i.test(text)) {
    return 'Free';
  }
  if (/\$|\/mo|\/month|\/yr|\/year|fixed/i.test(deal.value || '')) {
    return 'Fixed price';
  }
  if (/%|percent|off|save/i.test(text)) {
    return 'Percent off';
  }
  return 'Percent off';
}

export async function classifyDeal(deal, geminiApiKey = process.env.GEMINI_API_KEY) {
  const catalogEntry = getCompanyCatalogEntry(deal.company);
  const enrichedDesc = buildEnrichedDescription(deal.company, deal.title, deal.description);

  // If deal has an explicit catalog entry, trust it as the source of truth
  if (catalogEntry) {
    return {
      ...deal,
      category: catalogEntry.category,
      deal_type: deal.deal_type && VALID_DEAL_TYPES.includes(deal.deal_type) ? deal.deal_type : classifyDealType(deal),
      description: enrichedDesc,
    };
  }

  // If deal already has explicit valid category and deal_type, retain them but enrich description
  if (deal.category && VALID_CATEGORIES.includes(deal.category) &&
      deal.deal_type && VALID_DEAL_TYPES.includes(deal.deal_type)) {
    return {
      ...deal,
      description: enrichedDesc,
    };
  }

  // 1. Try Gemini LLM if API key is provided
  if (geminiApiKey) {
    try {
      const llmResult = await classifyWithGemini(deal, geminiApiKey);
      if (llmResult) {
        return {
          ...deal,
          category: llmResult.category,
          deal_type: llmResult.deal_type,
          value: llmResult.value || deal.value,
          description: buildEnrichedDescription(deal.company, deal.title, llmResult.description || deal.description),
        };
      }
    } catch (err) {
      console.warn(`[Classifier] Gemini fallback triggered: ${err.message}`);
    }
  }

  // 2. Rule-based Heuristic Fallback
  return classifyWithRules(deal);
}

/**
 * Classify a batch of deals in bulk using Gemini batch prompts (15 items per prompt)
 */
export async function classifyBatch(deals, geminiApiKey = process.env.GEMINI_API_KEY) {
  console.log(`[Classifier] Classifying ${deals.length} deals (Gemini: ${geminiApiKey ? 'Batch Mode' : 'Heuristic Mode'})...`);

  const results = new Array(deals.length);
  const unclassifiedIndices = [];

  for (let i = 0; i < deals.length; i++) {
    const d = deals[i];
    const catalogEntry = getCompanyCatalogEntry(d.company);

    // If company is in the verified catalog, apply catalog category and rich description
    if (catalogEntry) {
      results[i] = {
        ...d,
        category: catalogEntry.category,
        deal_type: d.deal_type && VALID_DEAL_TYPES.includes(d.deal_type) ? d.deal_type : classifyDealType(d),
        description: buildEnrichedDescription(d.company, d.title, d.description),
      };
      continue;
    }

    if (d.category && VALID_CATEGORIES.includes(d.category) &&
        d.deal_type && VALID_DEAL_TYPES.includes(d.deal_type)) {
      results[i] = {
        ...d,
        description: buildEnrichedDescription(d.company, d.title, d.description),
      };
    } else {
      unclassifiedIndices.push(i);
    }
  }

  console.log(`[Classifier] ${results.length - unclassifiedIndices.length} categorized (via catalog/existing), ${unclassifiedIndices.length} need classification.`);

  if (unclassifiedIndices.length === 0) {
    return results;
  }

  // If Gemini API Key is available, process in batches of 15
  if (geminiApiKey) {
    const batchSize = 15;
    for (let b = 0; b < unclassifiedIndices.length; b += batchSize) {
      const currentIndices = unclassifiedIndices.slice(b, b + batchSize);
      const batchPayload = currentIndices.map((idx) => ({
        index: idx,
        company: deals[idx].company,
        title: deals[idx].title,
        description: deals[idx].description || '',
        value: deals[idx].value || '',
      }));

      try {
        const classifiedMap = await classifyBatchWithGemini(batchPayload, geminiApiKey);
        for (const idx of currentIndices) {
          const match = classifiedMap.get(idx);
          if (match && VALID_CATEGORIES.includes(match.category) && VALID_DEAL_TYPES.includes(match.deal_type)) {
            results[idx] = {
              ...deals[idx],
              category: match.category,
              deal_type: match.deal_type,
              value: match.value || deals[idx].value,
              description: buildEnrichedDescription(deals[idx].company, deals[idx].title, match.description || deals[idx].description),
            };
          } else {
            results[idx] = classifyWithRules(deals[idx]);
          }
        }
      } catch (err) {
        console.warn(`[Classifier] Batch classification error, falling back to heuristics: ${err.message}`);
        for (const idx of currentIndices) {
          results[idx] = classifyWithRules(deals[idx]);
        }
      }
    }
  } else {
    // Fast heuristic classification
    for (const idx of unclassifiedIndices) {
      results[idx] = classifyWithRules(deals[idx]);
    }
  }

  return results;
}

/**
 * Call Gemini 1.5 Flash in bulk with a batch of deals
 */
async function classifyBatchWithGemini(batchDeals, apiKey) {
  const prompt = `
You are an expert student deal categorizer. For each deal in the JSON array below, categorize it into the exact allowed enums:
Allowed categories: ${JSON.stringify(VALID_CATEGORIES)}
Allowed deal_types: ${JSON.stringify(VALID_DEAL_TYPES)}

Input deals:
${JSON.stringify(batchDeals, null, 2)}

Return ONLY a valid JSON array matching this exact format:
[
  {
    "index": 0,
    "category": "one of the allowed categories",
    "deal_type": "one of the allowed deal types",
    "value": "concise discount like '15% Off', 'Free', '$5.99/mo'",
    "description": "one short, engaging sentence explaining the deal"
  }
]
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return new Map();

  const parsed = JSON.parse(text);
  const map = new Map();
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      map.set(item.index, item);
    }
  }
  return map;
}

/**
 * Single deal Gemini classification
 */
async function classifyWithGemini(deal, apiKey) {
  const prompt = `
You are a student discount categorizer. Categorize this student deal into the exact allowed enums:
Allowed categories: ${JSON.stringify(VALID_CATEGORIES)}
Allowed deal_types: ${JSON.stringify(VALID_DEAL_TYPES)}

Deal info:
Company: "${deal.company}"
Title: "${deal.title}"
Raw Description: "${deal.description || ''}"
Current Value: "${deal.value || ''}"

Return ONLY valid JSON with this structure:
{
  "category": "one of the allowed categories",
  "deal_type": "one of the allowed deal types",
  "value": "concise discount like '15% Off', 'Free', '$5.99/mo'",
  "description": "one short, engaging sentence explaining the deal"
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  if (VALID_CATEGORIES.includes(parsed.category) && VALID_DEAL_TYPES.includes(parsed.deal_type)) {
    return parsed;
  }
  return null;
}

/**
 * Smart Keyword Heuristics Engine
 */
function classifyWithRules(deal) {
  const text = `${deal.company} ${deal.title} ${deal.description || ''}`.toLowerCase();

  // 1. Check Catalog First
  const catalogEntry = getCompanyCatalogEntry(deal.company);
  let category = catalogEntry ? catalogEntry.category : null;

  // 2. Heuristics If Not In Catalog
  if (!category) {
    // Only classify as AI if it contains clear AI keywords with word boundaries
    // Avoid false positives like "pair", "retail", "claim", "repair"
    const hasAiKeyword =
      /\b(copilot|perplexity|chatgpt|claude|gemini|generative ai|llm|machine learning|notion ai|midjourney|openai)\b/i.test(text) ||
      (/\b(ai)\b/i.test(text) && !/boots|shoes|sneakers|footwear|sunglass|glasses|eyewear|apparel|clothing|scrubs/i.test(text));

    if (hasAiKeyword) {
      category = 'AI';
    } else if (/food|pizza|burger|kolache|bowl|bbq|restaurant|cafe|coffee|grill|dining|eats|snack|taco|kitchen|drink|soda|smoothie|meal kit|dinners|pastries/i.test(text)) {
      category = 'Food';
    } else if (/grocery|groceries|market|supermarket|target|walmart|costco|wholesale|warehouse club|bulk|dog food|7-eleven/i.test(text)) {
      category = 'Groceries';
    } else if (/spotify|hulu|disney|netflix|prime video|youtube premium|music|streaming|streaming bundle|subscription|therapy|roadside/i.test(text)) {
      category = 'Subscription';
    } else if (/hotel|resort|vacation|flight|airline|amtrak|car rental|travel|trip|lodging|disneyland|disney world|theme park|universal|dollywood|ski pass|ikon pass|luggage/i.test(text)) {
      category = 'Travel';
    } else if (/gym|fitness|workout|yoga|climbing|bowling|arcade|outdoor|hiking|running|shoes|boots|footwear|sneakers|clogs|sandals|scrubs|hoodie|activewear|mattress|bedding|sleep|pillow|glasses|eyewear|sunglasses|contacts|optometry|lenses|frames|theatre|theatres|cinema|movie|tickets|broadway|stadium|nfl|nba|sports|health|ring/i.test(text)) {
      category = 'Fitness';
    } else if (/print|copy|banner|stationery|paper|notebook/i.test(text)) {
      category = 'Print';
    } else if (/software|laptop|macbook|ipad|dell|lenovo|hp|code|hardware|electronics|developer|ide|cloud|phone|t-mobile|verizon|internet|power station|robot vacuum|appliances|turbotax|ssh|terminal|domain|ssl|hosting|database|mongodb|analytics|data science|datacamp|tableau|termius|figma|canva|programming|courses|server|linux/i.test(text)) {
      category = 'Tech';
    } else {
      category = 'Fitness'; // Default to lifestyle / fitness instead of defaulting everything to Tech
    }
  }

  // Deal Type Matching
  const deal_type = classifyDealType(deal);

  return {
    ...deal,
    category,
    deal_type,
    value: deal.value || (deal_type === 'Free' ? 'Free' : 'Special Discount'),
    description: buildEnrichedDescription(deal.company, deal.title, deal.description),
  };
}
