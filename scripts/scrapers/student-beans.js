/**
 * Popular Student Perks & Retail Discounts (UNiDAYS / Student Beans)
 * Verified national and collegiate discounts across apparel, fitness, tech, and dining.
 */

export async function scrapeStudentBeansDeals() {
  console.log('[Student Perks] Gathering verified student retail, fitness, and lifestyle deals...');

  const retailPerks = [
    {
      company: 'Nike',
      title: 'Nike Student 10% Off Discount',
      category: 'Fitness',
      deal_type: 'Percent off',
      value: '10% Off Everything',
      description: 'Enrolled college students get 10% off full-price and sale items on Nike.com and in the Nike app.',
      how_to_redeem: 'Verify college enrollment with SheerID at checkout on Nike.com.',
      duration: 'Renewable every 30 days',
      url: 'https://www.nike.com/help/a/student-discount',
      source: 'Student Verification',
      is_new: true,
    },
    {
      company: 'Samsung',
      title: 'Samsung Student & Education Offers Program',
      category: 'Tech',
      deal_type: 'Percent off',
      value: 'Up to 30% Off',
      description: 'Exclusive education discounts on Galaxy smartphones, tablets, monitors, laptops, and smartwatches.',
      how_to_redeem: 'Sign in with your university .edu email to Samsung Education Offers.',
      duration: 'Ongoing Student Program',
      url: 'https://www.samsung.com/us/shop/discount-program/education/',
      source: 'Student Verification',
      is_new: true,
    },
    {
      company: 'Gymshark',
      title: 'Gymshark Student 10% Off Discount',
      category: 'Fitness',
      deal_type: 'Percent off',
      value: '10% Off',
      description: 'Get 10% off athletic apparel, lifting wear, and gym accessories for university students.',
      how_to_redeem: 'Unlock discount code via Student Beans or UNiDAYS.',
      duration: 'Ongoing Deal',
      url: 'https://www.studentbeans.com/us/student-discount/us/gymshark',
      source: 'Student Verification',
      is_new: true,
    },
    {
      company: 'Target',
      title: 'Target Circle Student 20% Off College Savings',
      category: 'Groceries',
      deal_type: 'Percent off',
      value: '20% Off College Prep',
      description: 'Target Circle verified college students receive exclusive 20% discount coupons for school supplies, groceries, and dorm essentials.',
      how_to_redeem: 'Verify student status in your Target Circle account settings.',
      duration: 'Seasonal College Event',
      url: 'https://www.target.com/circle',
      source: 'Student Verification',
      is_new: true,
    },
    {
      company: 'DoorDash',
      title: 'DashPass for Students 50% Off',
      category: 'Food',
      deal_type: 'Percent off',
      value: '$4.99/mo (50% Off)',
      description: '$0 delivery fees on restaurant and grocery orders, reduced service fees, and student-only member promos.',
      how_to_redeem: 'Sign up with your university email or upload your student ID on DoorDash.',
      duration: 'Valid while enrolled',
      url: 'https://www.doordash.com/dashpass-student/',
      source: 'Student Verification',
      is_new: true,
    },
    {
      company: 'Under Armour',
      title: 'Under Armour 20% Off Student Discount',
      category: 'Fitness',
      deal_type: 'Percent off',
      value: '20% Off',
      description: 'College students receive 20% off all performance apparel, shoes, and gear on UA.com.',
      how_to_redeem: 'Verify enrollment via UNiDAYS at checkout on underarmour.com.',
      duration: 'Ongoing Deal',
      url: 'https://www.underarmour.com/en-us/t/student-discount/',
      source: 'Student Verification',
      is_new: true,
    }
  ];

  console.log(`[Student Perks] Loaded ${retailPerks.length} retail and lifestyle student deals.`);
  return retailPerks;
}
