import { classifyBatch } from './classify.js';

// Synthetic input makes the verification repeatable without publishing a listing.
const sample = {
  company: 'Demo Campus Bike Shop',
  title: '15% off bike repairs with a student ID',
  description: 'Show a current student ID to receive 15% off the repair service.',
  value: '15% off',
};
const [result] = await classifyBatch([sample], process.env.GEMINI_API_KEY, { requireGemini: true });
console.log(JSON.stringify({
  sample: result.title,
  category: result.category,
  dealType: result.deal_type,
}, null, 2));
