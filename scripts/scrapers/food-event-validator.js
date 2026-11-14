/**
 * Enforces strict quality validation on scraped free food events.
 * 
 * Per project policy, an event is only displayed if it contains:
 * 1. An informative event title
 * 2. A specific BYU building name (not generic "BYU Campus")
 * 3. A specific room number or designated room venue (not empty or "Not provided")
 * 4. A specific event start time
 * 5. A specific type of food being offered (not just vague "food")
 */

const GENERIC_FOOD = new Set([
  'food',
  'food not specified',
  'refreshment',
  'refreshments',
  'snacks',
  'free food',
]);

export function validateFoodEventQuality(ev) {
  const issues = [];

  // 1. Event title
  const title = (ev.title || '').trim();
  if (!title || title.length < 4) {
    issues.push('Missing or insufficiently detailed event title');
  }

  // 2. Specific building name
  const building = (ev.building || '').trim();
  const lowerBldg = building.toLowerCase();
  if (!building || lowerBldg === 'byu campus' || lowerBldg === 'location not provided' || lowerBldg === 'tbd') {
    issues.push('Missing specific building name');
  }

  // 3. Specific room number or designated room venue
  const room = (ev.room || '').trim();
  const lowerRoom = room.toLowerCase();
  if (!room || lowerRoom === 'not provided' || lowerRoom === 'none' || lowerRoom === 'tbd') {
    issues.push('Missing specific room number or designated room venue');
  }

  // 4. Event time
  const startTime = (ev.start_time || '').trim();
  if (!startTime || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(startTime)) {
    issues.push('Missing or invalid event start time');
  }

  // 5. Type of food being offered
  const food = (ev.food || '').trim();
  if (!food || GENERIC_FOOD.has(food.toLowerCase())) {
    issues.push('Missing specific type of food being offered');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
