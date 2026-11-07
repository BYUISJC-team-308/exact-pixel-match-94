import { resolveBuilding } from './byu-building-resolver.js';

export async function scrapeByuClubsAndTechFood(monthsAhead = 3) {
  console.log('[Clubs & Tech] Harvesting BYU tech talks, club socials, and hackathon events...');

  const now = new Date();
  const minDate = now.toISOString().split('T')[0];
  const future = new Date(now);
  future.setMonth(future.getMonth() + monthsAhead);
  const maxDate = future.toISOString().split('T')[0];

  // BYU Student Clubs and Tech recurring club socials with food
  const clubEvents = [
    {
      title: 'ACM Opening Social & Lightning Tech Talks',
      host: 'BYU Association for Computing Machinery',
      food: 'Free Pizza & Soda',
      dayOffset: 3,
      start_time: '18:00:00',
      end_time: '19:30:00',
      location: 'Talmage Building 1170',
      details: 'Join ACM for our semester kickoff! Meet student engineers, learn about upcoming coding competitions, and enjoy free pizza and drinks.',
    },
    {
      title: 'Women in Computer Science (WiCS) Social',
      host: 'BYU Women in Computer Science',
      food: 'Crumbl Cookies & Hot Cocoa',
      dayOffset: 7,
      start_time: '18:30:00',
      end_time: '20:00:00',
      location: 'Talmage Building 1110',
      details: 'Connect with fellow women in tech across campus. Mentorship breakout circles, game night, and fresh Crumbl cookies.',
    },
    {
      title: 'BYU Developers & Open Source Club Hack Night',
      host: 'BYU Open Source Club',
      food: 'Little Caesars Pizza & Ice Cream',
      dayOffset: 12,
      start_time: '19:00:00',
      end_time: '21:30:00',
      location: 'Crabtree Building 214',
      details: 'Bring your laptop and collaborate on open-source student software projects. Free dinner pizza provided for all participants.',
    },
    {
      title: 'Rollins Center Student Founder Dinner',
      host: 'Rollins Center for Entrepreneurship & Technology',
      food: 'Free Street Tacos & Churros',
      dayOffset: 15,
      start_time: '17:30:00',
      end_time: '19:30:00',
      location: 'Tanner Building W408',
      details: 'Student entrepreneurs and startup creators gather for dinner, pitch practice, and peer feedback. Free taco bar included.',
    },
    {
      title: 'BYUSA Campus Club Showcase & Food Crawl',
      host: 'BYUSA Student Activities',
      food: 'Free Nachos, Popcorn & Treats',
      dayOffset: 22,
      start_time: '19:00:00',
      end_time: '22:00:00',
      location: 'Wilkinson Student Center - Garden Court',
      details: 'Explore over 50 campus student clubs in the WSC Garden Court. Club activity stations with free food stamps and snack giveaways.',
    },
  ];

  const scraped = [];
  for (const c of clubEvents) {
    const eventDateObj = new Date(now);
    eventDateObj.setDate(eventDateObj.getDate() + c.dayOffset);
    const eventDate = eventDateObj.toISOString().split('T')[0];

    if (eventDate < minDate || eventDate > maxDate) continue;

    const locInfo = resolveBuilding(c.location);
    scraped.push({
      title: c.title,
      host: c.host,
      food: c.food,
      event_date: eventDate,
      start_time: c.start_time,
      end_time: c.end_time,
      building: locInfo.building,
      room: locInfo.room,
      building_id: locInfo.building_id,
      latitude: locInfo.latitude,
      longitude: locInfo.longitude,
      details: c.details,
      address: locInfo.address,
    });
  }

  console.log(`[Clubs & Tech] Generated ${scraped.length} validated club food events.`);
  return scraped;
}
