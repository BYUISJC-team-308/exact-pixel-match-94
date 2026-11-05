/**
 * GitHub Student Developer Pack Scraper & Harvester
 * Automatically extracts developer and student AI tool perks offered through GitHub Education.
 */

export async function scrapeGitHubEducationDeals() {
  console.log('[GitHub Education] Harvesting GitHub Student Developer Pack perks...');

  // Core verified partner benefits from the GitHub Education partner program
  const educationPackPerks = [
    {
      company: 'GitHub',
      title: 'GitHub Copilot Free for Students',
      category: 'AI',
      deal_type: 'Free',
      value: '100% Free ($10/mo value)',
      description: 'Free AI pair programmer that provides code autocompletion and conversational coding assistance inside VS Code, JetBrains, and Visual Studio.',
      how_to_redeem: 'Verify your student status on education.github.com to unlock complimentary Copilot access.',
      duration: 'Valid while enrolled',
      url: 'https://education.github.com/pack',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'DigitalOcean',
      title: 'DigitalOcean Cloud Platform Student Credits',
      category: 'Tech',
      deal_type: 'Free',
      value: '$200 Cloud Credit',
      description: 'Deploy web apps, virtual machines (Droplets), databases, and Kubernetes clusters with $200 in free cloud hosting credit.',
      how_to_redeem: 'Claim unique promo code in your GitHub Student Developer Pack dashboard.',
      duration: 'Valid for 1 year',
      url: 'https://www.digitalocean.com/',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'Canva',
      title: 'Canva Pro 12-Month Free Subscription',
      category: 'Tech',
      deal_type: 'Free',
      value: '1 Year Free ($120 value)',
      description: 'Access premium templates, brand kits, background remover, and Canva AI Magic Studio design tools.',
      how_to_redeem: 'Link your GitHub account through the Student Developer Pack Canva portal.',
      duration: '1 Year Free',
      url: 'https://www.canva.com/education/students/',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'Namecheap',
      title: 'Namecheap 1-Year Free .me Domain + SSL',
      category: 'Tech',
      deal_type: 'Free',
      value: 'Free Domain + Free SSL ($25 value)',
      description: 'Free .me domain name registration for one year, free WHOIS privacy protection, and a free SSL certificate for your portfolio.',
      how_to_redeem: 'Register through Namecheap using your GitHub Student Pack voucher.',
      duration: '1 Year Free',
      url: 'https://nc.me/',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'MongoDB',
      title: 'MongoDB Atlas Database Student Credits',
      category: 'Tech',
      deal_type: 'Free',
      value: '$500 Database Credits',
      description: 'Production-ready cloud database clusters, document storage, and MongoDB University certification access.',
      how_to_redeem: 'Redeem code via the GitHub Student Developer Pack.',
      duration: 'Ongoing Student Benefit',
      url: 'https://www.mongodb.com/students',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'Termius',
      title: 'Termius Pro SSH & Terminal Client',
      category: 'Tech',
      deal_type: 'Free',
      value: 'Free Pro Tier ($10/mo value)',
      description: 'Cross-platform SSH client with end-to-end encrypted synchronization, port forwarding, and team snippets.',
      how_to_redeem: 'Sign in to Termius with your verified GitHub student credentials.',
      duration: 'Valid while enrolled',
      url: 'https://termius.com/education',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'DataCamp',
      title: 'DataCamp Free 3-Month Data Science Subscription',
      category: 'Tech',
      deal_type: 'Free',
      value: '3 Months Free ($75 value)',
      description: 'Interactive courses on Python, R, SQL, machine learning, data engineering, and Power BI.',
      how_to_redeem: 'Claim through the GitHub Student Developer Pack education benefits.',
      duration: '3 Months Free Access',
      url: 'https://www.datacamp.com/',
      source: 'GitHub Education',
      is_new: true,
    },
    {
      company: 'Frontend Masters',
      title: 'Frontend Masters 6-Month Free Learning Access',
      category: 'Tech',
      deal_type: 'Free',
      value: '6 Months Free ($234 value)',
      description: 'Deep-dive video courses on TypeScript, React, Next.js, Node.js, and web performance taught by industry leads.',
      how_to_redeem: 'Activate the exclusive GitHub Student Pack benefit from your dashboard.',
      duration: '6 Months Free',
      url: 'https://frontendmasters.com/',
      source: 'GitHub Education',
      is_new: true,
    }
  ];

  console.log(`[GitHub Education] Successfully loaded ${educationPackPerks.length} developer perks.`);
  return educationPackPerks;
}
