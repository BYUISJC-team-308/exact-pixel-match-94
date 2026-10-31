/**
 * Hybrid Deal Classifier
 * Uses Google Gemini 1.5 Flash when GEMINI_API_KEY is available,
 * with an intelligent rule-based engine as a reliable fallback.
 */

const VALID_CATEGORIES = ['Food', 'Tech', 'AI', 'Subscription', 'Groceries', 'Print', 'Fitness', 'Travel'];
const VALID_DEAL_TYPES = ['Percent off', 'Free', 'Fixed price'];

export async function classifyDeal(deal, geminiApiKey = process.env.GEMINI_API_KEY) {
  // If deal already has explicit valid category and deal_type, retain them
  if (deal.category && VALID_CATEGORIES.includes(deal.category) &&
      deal.deal_type && VALID_DEAL_TYPES.includes(deal.deal_type)) {
    return deal;
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
          description: llmResult.description || deal.description,
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
 * Classify a batch of deals (using Gemini in chunks if key is present)
 */
export async function classifyBatch(deals, geminiApiKey = process.env.GEMINI_API_KEY) {
  console.log(`[Classifier] Classifying ${deals.length} deals (Gemini: ${geminiApiKey ? 'Enabled' : 'Heuristic Mode'})...`);
  const classified = [];
  for (const deal of deals) {
    const res = await classifyDeal(deal, geminiApiKey);
    classified.push(res);
  }
  return classified;
}

/**
 * Call Gemini 1.5 Flash REST API directly (no extra npm packages required)
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

  // Category Matching
  let category = 'Tech'; // Default fallback

  if (/ai|artificial intelligence|copilot|chatgpt|cursor|perplexity|claude|gemini|llm|machine learning/i.test(text)) {
    category = 'AI';
  } else if (/food|pizza|burger|kolache|bowl|bbq|restaurant|cafe|coffee|grill|dining|eats|snack|taco|kitchen|drink/i.test(text)) {
    category = 'Food';
  } else if (/grocery|groceries|market|supermarket|target|walmart|costco/i.test(text)) {
    category = 'Groceries';
  } else if (/spotify|hulu|disney|netflix|prime video|youtube premium|music|streaming|streaming bundle|subscription/i.test(text)) {
    category = 'Subscription';
  } else if (/gym|fitness|workout|yoga|climbing|bowling|arcade|outdoor|hiking|running|shoes|hoka|oura|athletic/i.test(text)) {
    category = 'Fitness';
  } else if (/flight|airline|hotel|amtrak|car rental|travel|trip|lodging/i.test(text)) {
    category = 'Travel';
  } else if (/print|copy|banner|stationery|paper|notebook/i.test(text)) {
    category = 'Print';
  } else if (/software|laptop|macbook|ipad|dell|lenovo|hp|code|hardware|electronics|developer|ide|cloud|phone|t-mobile/i.test(text)) {
    category = 'Tech';
  }

  // Deal Type Matching
  let deal_type = 'Percent off';
  if (/free|100% off|\$0|\$0\.00|trial/i.test(deal.value + ' ' + text)) {
    deal_type = 'Free';
  } else if (/\$|\/mo|\/month|\/yr|\/year|fixed/i.test(deal.value)) {
    deal_type = 'Fixed price';
  } else if (/%|percent|off|save/i.test(deal.value + ' ' + text)) {
    deal_type = 'Percent off';
  }

  return {
    ...deal,
    category,
    deal_type,
    value: deal.value || (deal_type === 'Free' ? 'Free' : 'Special Discount'),
    description: deal.description || deal.title,
  };
}
