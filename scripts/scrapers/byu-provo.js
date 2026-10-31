/**
 * Local BYU & Provo Student Discounts Directory
 * Covering popular local eateries, entertainment, and university services.
 */

export async function scrapeByuProvoDeals() {
  console.log('[BYU & Provo] Loading local campus and Utah County student deals...');

  const localDeals = [
    {
      company: 'Slab Pizza',
      title: 'Slab Pizza Provo Student Discount',
      category: 'Food',
      deal_type: 'Percent off',
      value: '10% Off',
      description: 'Get 10% off any giant slab pizza slice or whole pizza when you present a valid BYU or UVU student ID.',
      how_to_redeem: 'Show physical or digital BYU Student ID card at register.',
      duration: 'Ongoing Local Deal',
      url: 'https://slabpizza.com/',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'Cupbop Korean BBQ',
      title: 'Cupbop Provo Student Bowl Special',
      category: 'Food',
      deal_type: 'Percent off',
      value: '10% Off',
      description: 'Special student pricing on all Korean BBQ in a cup bowls at Provo locations.',
      how_to_redeem: 'Show BYU ID card when ordering at the register.',
      duration: 'Ongoing Local Deal',
      url: 'https://cupbop.com/',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'BYU Store',
      title: 'BYU Tech & Apple Campus Discount',
      category: 'Tech',
      deal_type: 'Percent off',
      value: 'Education Pricing ($50–$200 Off)',
      description: 'Education pricing on Apple laptops, iPads, accessories, and campus course materials for all currently enrolled students.',
      how_to_redeem: 'Visit the BYU Store Technology department or sign in to byustore.com with your NetID.',
      duration: 'Ongoing Campus Benefit',
      url: 'https://byustore.com/',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'Cinemark 16 Provo',
      title: 'Cinemark 16 Provo Student Ticket Pricing',
      category: 'Fitness',
      deal_type: 'Percent off',
      value: '$6.50 Movie Tickets',
      description: 'Discounted movie admissions every Tuesday and with student identification at Cinemark 16 on Towne Centre Blvd.',
      how_to_redeem: 'Show valid university ID at the box office or select Student pricing online.',
      duration: 'Weekly Promo',
      url: 'https://www.cinemark.com/theatres/ut-provo/cinemark-16-provo',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'FatCats Provo',
      title: 'FatCats Student Night Bowling & Arcade',
      category: 'Fitness',
      deal_type: 'Percent off',
      value: '$2 Games & Shoe Rental Deals',
      description: 'Late night student specials for bowling, laser tag, and arcade game credits.',
      how_to_redeem: 'Present your BYU student ID card at the front desk.',
      duration: 'Weekly Promo',
      url: 'https://www.fatcatsfun.com/provo',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'JCW’s The Burger Boys',
      title: 'JCW’s Student Combo Special',
      category: 'Food',
      deal_type: 'Percent off',
      value: '10% Off Combo Meals',
      description: 'Enjoy 10% off thick burgers, fresh fries, and famous shakes with student ID.',
      how_to_redeem: 'Show student ID during checkout in Provo.',
      duration: 'Ongoing Local Deal',
      url: 'https://www.jcws.com/',
      source: 'BYU / Provo Local',
      is_new: true,
    },
    {
      company: 'Hruska’s Kolaches',
      title: 'Hruska’s Student Morning Deal',
      category: 'Food',
      deal_type: 'Fixed price',
      value: 'Free Drink with 3 Kolaches',
      description: 'Free beverage with any purchase of 3 breakfast or sweet kolaches at the Provo location.',
      how_to_redeem: 'Mention student promo and show student ID.',
      duration: 'Ongoing Local Deal',
      url: 'https://www.hruskaskolaches.com/',
      source: 'BYU / Provo Local',
      is_new: true,
    }
  ];

  console.log(`[BYU & Provo] Loaded ${localDeals.length} local student deals.`);
  return localDeals;
}
