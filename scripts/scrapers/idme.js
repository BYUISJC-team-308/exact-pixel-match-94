import * as cheerio from 'cheerio';

export async function scrapeIdMe() {
  console.log('[ID.me] Starting scraper for shop.id.me/student...');
  const deals = [];
  const maxPages = 3;

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? 'https://shop.id.me/student' : `https://shop.id.me/student?page=${page}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!res.ok) {
        console.warn(`[ID.me] Page ${page} failed with status: ${res.status}`);
        break;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      $('fragno-featured-card, fragno-hero-card').each((_, el) => {
        const attrs = el.attribs || {};
        const title = (attrs.title || '').trim();
        const company = (attrs['store-text'] || attrs['store-name'] || '').trim();
        const href = attrs['card-href'] || attrs['cta-href'] || '';
        const description = (attrs.description || attrs.subtitle || '').trim();

        if (!title || !company) return;

        // Extract value / discount percentage or amount
        const discountRegex = /(\d+%\s*off|\$\d+\s*off|free|up to \d+%\s*off|save \d+[\d.]*%)/i;
        const discountMatch = title.match(discountRegex) || description.match(discountRegex);
        const value = discountMatch ? discountMatch[0] : (attrs.subtitle && attrs.subtitle.includes('%') ? attrs.subtitle : 'Student Deal');

        const dealUrl = href.startsWith('http') ? href : `https://shop.id.me${href}`;

        deals.push({
          company,
          title,
          value,
          description: description || title,
          how_to_redeem: 'Verify your student status with ID.me at checkout to unlock savings.',
          duration: 'Active Deal',
          url: dealUrl,
          source: 'ID.me',
          is_new: true,
        });
      });
    } catch (err) {
      console.error(`[ID.me] Error fetching page ${page}:`, err.message);
    }
  }

  // Deduplicate by company + title
  const seen = new Set();
  const uniqueDeals = [];
  for (const d of deals) {
    const key = `${d.company.toLowerCase()}|${d.title.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDeals.push(d);
    }
  }

  console.log(`[ID.me] Successfully scraped ${uniqueDeals.length} unique deals.`);
  return uniqueDeals;
}
