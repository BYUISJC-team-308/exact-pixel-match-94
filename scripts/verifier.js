/**
 * Automated Deal Health & Link Verifier
 * Periodically checks deal URLs to catch expired promotions, discontinued offers, and 404s.
 */

const DEAD_PHRASES = [
  'this offer has expired',
  'promotion has ended',
  'offer is no longer available',
  'promotion is no longer available',
  'program has been discontinued',
  'student discount has ended',
  'student program is no longer active',
  'registration is closed',
  'this deal is no longer active',
  'deal has expired',
];

/**
 * Check if a single deal URL is active and healthy
 */
export async function checkDealUrl(url, timeoutMs = 6000) {
  if (!url || !url.startsWith('http')) {
    return { ok: true, reason: 'No external URL' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);

    // Only genuine 404 Not Found or 410 Gone mean the deal page was permanently deleted
    if (res.status === 404 || res.status === 410) {
      return { ok: false, reason: `HTTP ${res.status} Page Not Found` };
    }

    // Notice: 401, 403, 418, 429 are anti-bot / auth challenges (Cloudflare, Akamai, etc.).
    // These work in normal student browsers, so do NOT treat them as dead deals.
    if (!res.ok) {
      return { ok: true, reason: `HTTP ${res.status} (anti-bot / auth challenge, kept active)` };
    }

    // Inspect HTML content
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await res.text();

      // 1. Check <title> tag for 404 / Page Not Found / Access Denied
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        const titleText = titleMatch[1].toLowerCase();
        if (titleText.includes('404') || titleText.includes('page not found') || titleText.includes('access denied')) {
          return { ok: false, reason: `Page title indicates dead page: "${titleMatch[1].trim()}"` };
        }
      }

      // 2. Strip scripts and styles to check visible content for definitive expiration statements
      const contentOnly = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .toLowerCase();

      for (const phrase of DEAD_PHRASES) {
        if (contentOnly.includes(phrase)) {
          return { ok: false, reason: `Page content confirms: "${phrase}"` };
        }
      }
    }

    return { ok: true };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      // Don't kill deals on slow timeouts — external student portals often have CDN anti-bot delays
      return { ok: true, reason: 'Timeout (kept active)' };
    }
    return { ok: true, reason: `Network warning: ${err.message}` };
  }
}

/**
 * Audit all active deals in Supabase and prune dead/expired links
 */
export async function auditAndPruneDeadDeals(supabase, batchSize = 5) {
  console.log('[Verifier] Starting link health check on active deals in Supabase...');

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, company, title, url')
    .not('url', 'is', null);

  if (error) {
    console.warn('[Verifier] Error fetching deals to verify:', error.message);
    return { checked: 0, removed: 0 };
  }

  if (!deals || deals.length === 0) {
    console.log('[Verifier] No deals with URLs found to audit.');
    return { checked: 0, removed: 0 };
  }

  console.log(`[Verifier] Auditing ${deals.length} deals...`);
  const deadDeals = [];

  for (let i = 0; i < deals.length; i += batchSize) {
    const chunk = deals.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (deal) => {
        const result = await checkDealUrl(deal.url);
        if (!result.ok) {
          console.warn(`[Verifier] ⚠️ Dead/Expired deal detected: [${deal.company}] ${deal.title} (${result.reason})`);
          deadDeals.push(deal);
        }
      })
    );
  }

  if (deadDeals.length > 0) {
    const deadIds = deadDeals.map((d) => d.id);
    const { error: delError } = await supabase
      .from('deals')
      .delete()
      .in('id', deadIds);

    if (delError) {
      console.error('[Verifier] Error removing dead deals:', delError.message);
    } else {
      console.log(`[Verifier] 🧹 Successfully removed ${deadDeals.length} expired or dead deal(s) from Supabase.`);
    }
  } else {
    console.log('[Verifier] ✨ All audited deals are healthy and active!');
  }

  return { checked: deals.length, removed: deadDeals.length };
}
