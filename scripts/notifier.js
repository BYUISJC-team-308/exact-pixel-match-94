/**
 * StudEats Automated Deal Notifier
 * Sends formatted alert notifications to Discord or Slack via Webhooks
 * when new deals, high-value discounts, or freebies are discovered by the scraper.
 */

export async function sendScraperAlert({
  stats = { inserted: 0, updated: 0, skipped: 0 },
  newDeals = [],
  updatedDeals = [],
  discordWebhook = process.env.DISCORD_WEBHOOK_URL,
  slackWebhook = process.env.SLACK_WEBHOOK_URL,
}) {
  if (!discordWebhook && !slackWebhook) {
    console.log('[Notifier] Neither DISCORD_WEBHOOK_URL nor SLACK_WEBHOOK_URL is set.');
    console.log('[Notifier] Tip: Add DISCORD_WEBHOOK_URL to your .env or GitHub Secrets to receive automatic freebie alerts.');
    return;
  }

  // Identify high-value deals and freebies to feature
  const freebies = newDeals.filter(
    (d) => d.deal_type === 'Free' || /free|100% off|\$0\b/i.test(d.value || '')
  );

  const bigDiscounts = newDeals.filter((d) => {
    const match = (d.value || '').match(/(\d+)%/);
    return match && parseInt(match[1], 10) >= 40 && !freebies.includes(d);
  });

  const featured = [...freebies, ...bigDiscounts].slice(0, 8);

  // 1. Dispatch to Discord Webhook
  if (discordWebhook) {
    try {
      await sendDiscordNotification(discordWebhook, { stats, freebies, bigDiscounts, featured, newDeals });
      console.log('📢 [Notifier] Successfully posted scraper alert to Discord!');
    } catch (err) {
      console.error('❌ [Notifier] Failed to post to Discord webhook:', err.message);
    }
  }

  // 2. Dispatch to Slack Webhook
  if (slackWebhook) {
    try {
      await sendSlackNotification(slackWebhook, { stats, freebies, bigDiscounts, featured, newDeals });
      console.log('📢 [Notifier] Successfully posted scraper alert to Slack!');
    } catch (err) {
      console.error('❌ [Notifier] Failed to post to Slack webhook:', err.message);
    }
  }
}

/**
 * Format and send Discord Embed
 */
async function sendDiscordNotification(webhookUrl, { stats, freebies, bigDiscounts, featured, newDeals }) {
  const isFreebieAlert = freebies.length > 0;
  const embedColor = isFreebieAlert ? 0x10b981 : 0x3b82f6; // Green for freebies, blue for regular

  let description = `**Daily Scraper Run Completed**\n` +
    `• 📥 **${stats.inserted || newDeals.length}** new deals added\n` +
    `• 🔄 **${stats.updated || 0}** deals updated\n` +
    `• ⏭️ **${stats.skipped || 0}** unchanged deals verified`;

  const fields = [];

  if (freebies.length > 0) {
    const freebieLines = freebies.slice(0, 5).map(d =>
      `• **[${d.company}](${d.url || 'https://studeats.app'})** — ${d.title} (🏷️ \`${d.value || 'Free'}\`)`
    ).join('\n');
    fields.push({
      name: `🎁 New Student Freebies (${freebies.length})`,
      value: freebieLines || 'None discovered in this run.',
      inline: false,
    });
  }

  if (bigDiscounts.length > 0) {
    const discountLines = bigDiscounts.slice(0, 5).map(d =>
      `• **[${d.company}](${d.url || 'https://studeats.app'})** — ${d.title} (🏷️ \`${d.value}\`)`
    ).join('\n');
    fields.push({
      name: `🔥 Big Student Discounts (40%+ Off)`,
      value: discountLines || 'None discovered in this run.',
      inline: false,
    });
  }

  if (fields.length === 0 && newDeals.length > 0) {
    const recentLines = newDeals.slice(0, 5).map(d =>
      `• **${d.company}**: ${d.title} (${d.value || 'Student Deal'})`
    ).join('\n');
    fields.push({
      name: `✨ Newly Discovered Deals`,
      value: recentLines,
      inline: false,
    });
  }

  const payload = {
    username: 'StudEats Deal Radar 🍕',
    avatar_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=128&auto=format&fit=crop&q=80',
    embeds: [
      {
        title: isFreebieAlert ? '🚨 New Student Freebies & Deals Discovered!' : '⚡ StudEats Daily Scraper Report',
        description,
        color: embedColor,
        fields,
        footer: {
          text: `StudEats Automation • BYU & Provo Student Perks • ${new Date().toLocaleDateString()}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Discord API responded with status ${res.status}: ${res.statusText}`);
  }
}

/**
 * Format and send Slack Block Kit Message
 */
async function sendSlackNotification(webhookUrl, { stats, freebies, bigDiscounts, newDeals }) {
  const isFreebieAlert = freebies.length > 0;
  const headerText = isFreebieAlert ? '🚨 New Student Freebies & Deals Discovered!' : '⚡ StudEats Daily Scraper Report';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: headerText,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Daily Scraper Run Completed*\n• *${stats.inserted || newDeals.length}* new deals inserted\n• *${stats.updated || 0}* deals updated\n• *${stats.skipped || 0}* unchanged verified`,
      },
    },
    { type: 'divider' },
  ];

  if (freebies.length > 0) {
    const freeText = freebies.slice(0, 5).map(d =>
      `• *<${d.url || 'https://studeats.app'}|${d.company}>*: ${d.title} (🏷️ \`${d.value || 'Free'}\`)`
    ).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎁 Freebies Discovered:*\n${freeText}`,
      },
    });
  }

  if (bigDiscounts.length > 0) {
    const discountText = bigDiscounts.slice(0, 5).map(d =>
      `• *<${d.url || 'https://studeats.app'}|${d.company}>*: ${d.title} (🏷️ \`${d.value}\`)`
    ).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔥 Big Discounts (40%+ Off):*\n${discountText}`,
      },
    });
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) {
    throw new Error(`Slack API responded with status ${res.status}: ${res.statusText}`);
  }
}

// Allow standalone test run via CLI: node scripts/notifier.js --test
if (process.argv.includes('--test')) {
  console.log('🧪 Testing StudEats webhook notifier with sample freebie deals...');
  const sampleDeals = [
    {
      company: 'Google',
      title: 'Google AI Pro 1-Year Free Student Plan',
      deal_type: 'Free',
      value: '1 Year Free ($240 value)',
      url: 'https://gemini.google/students/',
    },
    {
      company: 'OpenAI',
      title: 'ChatGPT Plus & Edu Student Program',
      deal_type: 'Free',
      value: '4 Months Free / Campus Edu Access',
      url: 'https://chatgpt.com',
    },
    {
      company: 'Adobe',
      title: 'Adobe Creative Cloud All Apps 60% Off',
      deal_type: 'Percent off',
      value: '60% Off ($19.99/mo)',
      url: 'https://www.adobe.com/creativecloud/buy/students.html',
    },
  ];

  sendScraperAlert({
    stats: { inserted: 3, updated: 2, skipped: 121 },
    newDeals: sampleDeals,
  });
}
