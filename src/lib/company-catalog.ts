/**
 * Comprehensive Company Knowledge Catalog & Category Mapper
 * Provides explicit descriptions, taglines, and categories for student discount brands.
 */

import type { DealCategory } from '@/lib/data';

export interface CompanyCatalogEntry {
  tagline: string;
  whatTheyDo: string;
  category: DealCategory;
  categories?: DealCategory[];
}

export const COMPANY_CATALOG: Record<string, CompanyCatalogEntry> = {
  '1password': {
    tagline: 'Password Security & Digital Vault',
    whatTheyDo: '1Password provides industry-standard encrypted password management, passkey storage, and digital credential security.',
    category: 'Tech',
  },
  'autodesk': {
    tagline: '3D CAD & Engineering Software',
    whatTheyDo: 'Autodesk provides professional 3D CAD design tools, AutoCAD, Revit, and Inventor for engineering and architectural modeling.',
    category: 'Tech',
  },
  'bose': {
    tagline: 'Noise-Canceling Headphones & Audio',
    whatTheyDo: 'Bose engineers high-fidelity wireless noise-canceling headphones, QuietComfort earbuds, and portable Bluetooth speakers.',
    category: 'Tech',
  },
  'digitalocean': {
    tagline: 'Cloud Hosting, Droplets & Databases',
    whatTheyDo: 'DigitalOcean provides developer-friendly virtual private servers (Droplets), cloud Kubernetes clusters, and managed databases.',
    category: 'Tech',
  },
  'disneyland® resort - california': {
    tagline: 'Disneyland Theme Parks & Attractions',
    whatTheyDo: 'Disneyland Resort in California features iconic Disney theme park attractions, lands, and entertainment.',
    category: 'Fitness',
  },
  'disneyland': {
    tagline: 'Disneyland Theme Parks & Attractions',
    whatTheyDo: 'Disneyland Resort in California features iconic Disney theme park attractions, lands, and entertainment.',
    category: 'Fitness',
  },
  'ebay': {
    tagline: 'Online Marketplace & Tech Deals',
    whatTheyDo: 'eBay is a global online marketplace for new and refurbished electronics, tech accessories, and textbooks.',
    category: 'Tech',
  },
  'gymshark': {
    tagline: 'Gym Workout Clothes & Activewear',
    whatTheyDo: 'Gymshark designs athletic workout apparel, seamless lifting leggings, and performance training clothes.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'nba basketball tickets': {
    tagline: 'NBA Game Tickets & Arena Passes',
    whatTheyDo: 'Exclusive ticket portal for National Basketball Association regular season games, arena seats, and playoff matchups.',
    category: 'Fitness',
  },
  'nba': {
    tagline: 'NBA Game Tickets & Arena Passes',
    whatTheyDo: 'Exclusive ticket portal for National Basketball Association regular season games, arena seats, and playoff matchups.',
    category: 'Fitness',
  },
  'nike': {
    tagline: 'Athletic Running Shoes & Sportswear',
    whatTheyDo: 'Nike designs industry-leading performance running shoes, athletic apparel, and lifestyle sneakers.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'samsung': {
    tagline: 'Galaxy Phones, Tablets & Displays',
    whatTheyDo: 'Samsung manufactures Galaxy Android smartphones, lightweight tablets, OLED monitors, and student electronics.',
    category: 'Tech',
  },
  'target': {
    tagline: 'Dorm Essentials, Snacks & Home Goods',
    whatTheyDo: 'Target provides dorm bedding, college school supplies, fresh groceries, and everyday household essentials.',
    category: 'Groceries',
  },
  'therabody': {
    tagline: 'Percussive Massage Guns & Recovery',
    whatTheyDo: 'Therabody creates Theragun handheld percussive therapy massage guns, pneumatic compression boots, and recovery wellness devices.',
    category: 'Fitness',
    categories: ['Fitness', 'Tech'],
  },
  'under armour': {
    tagline: 'Performance Sportswear & Training Gear',
    whatTheyDo: 'Under Armour designs athletic compression apparel, moisture-wicking workout shirts, and training footwear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'walt disney world® resort': {
    tagline: 'Disney World Theme Parks & Resorts',
    whatTheyDo: 'Walt Disney World in Florida features four world-class theme parks, water parks, and entertainment complexes.',
    category: 'Fitness',
  },
  'walt disney world': {
    tagline: 'Disney World Theme Parks & Resorts',
    whatTheyDo: 'Walt Disney World in Florida features four world-class theme parks, water parks, and entertainment complexes.',
    category: 'Fitness',
  },
  'youtube': {
    tagline: 'Ad-Free Video Streaming & YouTube Music',
    whatTheyDo: 'YouTube Premium delivers ad-free video streaming, offline downloads, background playback, and YouTube Music.',
    category: 'Subscription',
  },
  'saatva': {
    tagline: 'Luxury Mattresses & Bedding',
    whatTheyDo: 'Saatva crafts luxury handcrafted innerspring and memory foam mattresses, organic bedding, and adjustable bed bases.',
    category: 'Fitness',
  },
  'leesa': {
    tagline: 'Premium Hybrid Mattresses',
    whatTheyDo: 'Leesa creates premium memory foam and hybrid cooling mattresses, pillows, and sleep accessories.',
    category: 'Fitness',
  },
  'glassesusa.com': {
    tagline: 'Prescription Eyewear & Contacts',
    whatTheyDo: 'GlassesUSA.com is an online retailer for prescription eyeglasses, designer sunglasses, and contact lenses (FSA/HSA eligible).',
    category: 'Fitness',
  },
  'glassesusa': {
    tagline: 'Prescription Eyewear & Contacts',
    whatTheyDo: 'GlassesUSA.com is an online retailer for prescription eyeglasses, designer sunglasses, and contact lenses (FSA/HSA eligible).',
    category: 'Fitness',
  },
  'red wing': {
    tagline: 'Handcrafted Leather Work Boots',
    whatTheyDo: 'Red Wing is an iconic American brand known for durable handcrafted leather work boots and heritage footwear.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'figs': {
    tagline: 'Medical Scrubs & Healthcare Apparel',
    whatTheyDo: 'FIGS designs premium modern medical scrubs, lab coats, and performance activewear for nursing and medical students.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'amc theatres®': {
    tagline: 'Cinema & Movie Admissions',
    whatTheyDo: 'AMC Theatres is the nation’s largest cinema chain featuring IMAX, Dolby Cinema, and concession dining.',
    category: 'Fitness',
  },
  'amc theatres': {
    tagline: 'Cinema & Movie Admissions',
    whatTheyDo: 'AMC Theatres is the nation’s largest cinema chain featuring IMAX, Dolby Cinema, and concession dining.',
    category: 'Fitness',
  },
  'cinemark 16 provo': {
    tagline: 'Local Movie Theatre & Admissions',
    whatTheyDo: 'Cinemark 16 at Towne Centre is Provo’s favorite movie theater featuring discount student tickets and luxury loungers.',
    category: 'Fitness',
  },
  'fatcats provo': {
    tagline: 'Bowling, Arcade & Laser Tag',
    whatTheyDo: 'FatCats Provo is an entertainment center with bowling lanes, arcade games, glowing mini-golf, and student night specials.',
    category: 'Fitness',
  },
  'sam\'s club': {
    tagline: 'Wholesale Bulk Groceries & Gas',
    whatTheyDo: 'Sam’s Club is a warehouse club offering bulk groceries, dorm supplies, electronics, and discount fuel.',
    category: 'Groceries',
  },
  'bj\'s wholesale club': {
    tagline: 'Wholesale Groceries & Household Goods',
    whatTheyDo: 'BJ’s Wholesale Club offers warehouse savings on groceries, fresh produce, dorm snacks, and household essentials.',
    category: 'Groceries',
  },
  '7-eleven': {
    tagline: 'Convenience Snacks & Gas Rewards',
    whatTheyDo: '7-Eleven provides 24/7 convenience groceries, hot snacks, fresh coffee, and student fuel discounts.',
    category: 'Groceries',
  },
  'b1g+': {
    tagline: 'Collegiate Live Sports Streaming',
    whatTheyDo: 'B1G+ is the dedicated streaming network for live Big Ten college football, basketball, and championship sports.',
    category: 'Subscription',
  },
  'stubhub': {
    tagline: 'Concert & Sports Ticket Marketplace',
    whatTheyDo: 'StubHub is a ticket exchange platform for live concerts, college football, NBA games, and Broadway performances.',
    category: 'Fitness',
  },
  'vivid seats': {
    tagline: 'Live Event & Concert Tickets',
    whatTheyDo: 'Vivid Seats is a marketplace for verified concert tickets, sporting events, and live theater productions.',
    category: 'Fitness',
  },
  'broadway shows': {
    tagline: 'Broadway Musical & Theater Tickets',
    whatTheyDo: 'MemberDeals Broadway provides discounted admissions to top musicals, plays, and live theater productions.',
    category: 'Fitness',
  },
  'nfl football tickets': {
    tagline: 'NFL Game Tickets & Stadium Passes',
    whatTheyDo: 'Exclusive student ticket portal for live National Football League regular season and playoff games.',
    category: 'Fitness',
  },
  'hoka': {
    tagline: 'Max-Cushion Running & Trail Shoes',
    whatTheyDo: 'HOKA designs ultra-cushioned running shoes, walking sneakers, and trail footwear for athletes and everyday comfort.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'on': {
    tagline: 'Swiss-Engineered Running Shoes',
    whatTheyDo: 'On designs high-performance Swiss running shoes, cushioned sneakers, and athletic workout apparel.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'saucony us': {
    tagline: 'Performance Running Footwear',
    whatTheyDo: 'Saucony builds technical road running shoes, trail sneakers, and marathon training footwear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'saucony': {
    tagline: 'Performance Running Footwear',
    whatTheyDo: 'Saucony builds technical road running shoes, trail sneakers, and marathon training footwear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'merrell us': {
    tagline: 'Outdoor Hiking Boots & Trail Gear',
    whatTheyDo: 'Merrell designs rugged hiking boots, trail running shoes, and outdoor adventure footwear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'columbia sportswear': {
    tagline: 'Outdoor Jackets, Fleeces & Hiking Gear',
    whatTheyDo: 'Columbia Sportswear manufactures waterproof winter jackets, fleece pullovers, and outdoor hiking equipment.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'crocs': {
    tagline: 'Comfort Clogs & Casual Slides',
    whatTheyDo: 'Crocs makes lightweight foam clogs, casual sandals, and collectible Jibbitz charms popular across campuses.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'birkenstock usa': {
    tagline: 'Orthopedic Footbed Cork Sandals',
    whatTheyDo: 'Birkenstock manufactures iconic German cork-footbed sandals, clogs, and casual supportive footwear.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'heydude': {
    tagline: 'Lightweight Casual Slip-On Shoes',
    whatTheyDo: 'HEYDUDE designs lightweight, flexible slip-on loafers and casual everyday sneakers.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'reebok': {
    tagline: 'Classic Sneakers & Training Apparel',
    whatTheyDo: 'Reebok produces retro lifestyle sneakers, CrossFit training shoes, and fitness workout gear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'tecovas': {
    tagline: 'Handmade Western Leather Cowboy Boots',
    whatTheyDo: 'Tecovas crafts handmade western leather boots, travel duffels, and classic leather goods.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'oofos': {
    tagline: 'Active Recovery Footwear & Slides',
    whatTheyDo: 'OOFOS designs impact-absorbing recovery sandals and foam slides engineered to soothe tired feet.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'beyond yoga': {
    tagline: 'Buttery-Soft Yoga Apparel & Leggings',
    whatTheyDo: 'Beyond Yoga manufactures ultra-soft workout leggings, biker shorts, and athletic activewear.',
    category: 'Apparel',
    categories: ['Apparel', 'Fitness'],
  },
  'comfrt': {
    tagline: 'Weighted Sensory Anxiety Hoodies',
    whatTheyDo: 'Comfrt designs sensory-friendly weighted loungewear and anxiety-relief oversized hoodies.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'oura': {
    tagline: 'Smart Health & Sleep Tracking Rings',
    whatTheyDo: 'Oura produces smart rings that track biometric readiness, sleep stages, body temperature, and stress.',
    category: 'Fitness',
    categories: ['Fitness', 'Tech'],
  },
  'ultrahuman': {
    tagline: 'Smart Metabolic & Sleep Health Rings',
    whatTheyDo: 'Ultrahuman designs smart rings and continuous glucose trackers monitoring circadian rhythms and recovery.',
    category: 'Fitness',
  },
  'peloton': {
    tagline: 'Connected Fitness Bikes & App Workouts',
    whatTheyDo: 'Peloton delivers interactive cardio cycling workouts, strength training, and guided fitness classes.',
    category: 'Fitness',
  },
  'majorfitness': {
    tagline: 'Home Gym Power Racks & Strength Gear',
    whatTheyDo: 'Major Fitness builds all-in-one home gym power cages, barbells, and heavy strength training equipment.',
    category: 'Fitness',
  },
  'aventon bikes': {
    tagline: 'Commuter Electric Bikes & E-Bikes',
    whatTheyDo: 'Aventon builds high-efficiency commuter e-bikes, urban electric bicycles, and cycling accessories.',
    category: 'Fitness',
  },
  'canyon': {
    tagline: 'Performance Road & Mountain Bikes',
    whatTheyDo: 'Canyon is an award-winning German manufacturer of performance road, gravel, and mountain bicycles.',
    category: 'Fitness',
  },
  'avocado mattress': {
    tagline: 'Organic Certified Latex Mattresses',
    whatTheyDo: 'Avocado crafts certified organic latex mattresses, non-toxic pillows, and eco-friendly bedding.',
    category: 'Fitness',
  },
  'brooklyn bedding': {
    tagline: 'Custom-Crafted Cooling Mattresses',
    whatTheyDo: 'Brooklyn Bedding manufactures custom hybrid mattresses, cooling memory foam, and sleep foundations.',
    category: 'Fitness',
  },
  'titan mattress': {
    tagline: 'Heavy-Duty Supportive Mattresses',
    whatTheyDo: 'Titan by Brooklyn Bedding designs heavy-duty, ultra-durable mattresses engineered for maximum support.',
    category: 'Fitness',
  },
  'mattress firm': {
    tagline: 'Mattress & Sleep Product Retailer',
    whatTheyDo: 'Mattress Firm is the leading national retailer for beds, memory foam, box springs, and adjustable bases.',
    category: 'Fitness',
  },
  'caraway': {
    tagline: 'Non-Toxic Ceramic Cookware & Pans',
    whatTheyDo: 'Caraway designs non-stick, non-toxic ceramic pots, pans, bakeware, and meal prep storage sets.',
    category: 'Fitness',
  },
  'stanley 1913': {
    tagline: 'Insulated Stainless Steel Quenchers',
    whatTheyDo: 'Stanley 1913 manufactures vacuum-insulated stainless steel drinkware, travel tumblers, and thermal thermoses.',
    category: 'Fitness',
  },
  'ecoflow': {
    tagline: 'Portable Power Stations & Solar Backup',
    whatTheyDo: 'EcoFlow builds portable battery power stations, solar panels, and smart home backup generators.',
    category: 'Tech',
  },
  'roborock': {
    tagline: 'Smart Robot Vacuums & Sonic Mops',
    whatTheyDo: 'Roborock designs autonomous smart robot vacuum cleaners with laser navigation and sonic mopping.',
    category: 'Tech',
  },
  'sonos': {
    tagline: 'Premium Multi-Room Wireless Speakers',
    whatTheyDo: 'Sonos manufactures high-fidelity smart home sound systems, wireless soundbars, and portable speakers.',
    category: 'Tech',
  },
  'sony': {
    tagline: 'Noise-Canceling Headphones & Cameras',
    whatTheyDo: 'Sony produces industry-leading noise-canceling headphones, PlayStation consoles, and digital mirrorless cameras.',
    category: 'Tech',
  },
  'the ge appliances store': {
    tagline: 'Major Home & Kitchen Appliances',
    whatTheyDo: 'GE Appliances provides refrigerators, microwave ovens, dishwashers, and laundry washers and dryers.',
    category: 'Tech',
  },
  'lenovo us': {
    tagline: 'Laptops, ThinkPads & Student PCs',
    whatTheyDo: 'Lenovo builds ThinkPad laptops, IdeaPad notebooks, computer monitors, and student PC accessories.',
    category: 'Tech',
  },
  'lenovo': {
    tagline: 'Laptops, ThinkPads & Student PCs',
    whatTheyDo: 'Lenovo builds ThinkPad laptops, IdeaPad notebooks, computer monitors, and student PC accessories.',
    category: 'Tech',
  },
  't-mobile': {
    tagline: 'Wireless Phone Plans & 5G Data',
    whatTheyDo: 'T-Mobile offers 5G mobile cell phone plans, unlimited data, and discounted student connectivity packages.',
    category: 'Tech',
  },
  'verizon': {
    tagline: 'Mobile Phone Plans & 5G Wireless',
    whatTheyDo: 'Verizon provides nationwide 5G mobile wireless plans, student smartphone deals, and accessories.',
    category: 'Tech',
  },
  'verizon home internet': {
    tagline: 'High-Speed 5G Home Internet',
    whatTheyDo: 'Verizon Home Internet provides reliable high-speed 5G Wi-Fi with no annual contracts or equipment fees.',
    category: 'Tech',
  },
  'turbotax': {
    tagline: 'Online Tax Filing & Refund Prep',
    whatTheyDo: 'TurboTax provides guided software for preparing and e-filing federal and state income tax returns.',
    category: 'Tech',
  },
  'betterhelp': {
    tagline: 'Online Therapy & Mental Counseling',
    whatTheyDo: 'BetterHelp provides confidential online teletherapy and messaging with licensed professional therapists.',
    category: 'Subscription',
  },
  'aaa membership': {
    tagline: 'Roadside Assistance & Auto Perks',
    whatTheyDo: 'AAA provides 24/7 roadside towing, flat tire repair, jump starts, and travel and dining member discounts.',
    category: 'Subscription',
  },
  'the farmer\'s dog': {
    tagline: 'Fresh Human-Grade Dog Food Delivery',
    whatTheyDo: 'The Farmer’s Dog delivers fresh, human-grade, vet-developed pet meal plans directly to your doorstep.',
    category: 'Groceries',
  },
  'home chef': {
    tagline: 'Weekly Fresh Meal Kit Delivery',
    whatTheyDo: 'Home Chef delivers fresh pre-portioned meal kits with easy recipes to cook fast dinners at home.',
    category: 'Food',
  },
  'tempo by home chef': {
    tagline: 'Microwave-Ready Fast Student Dinners',
    whatTheyDo: 'Tempo delivers single-serve, heat-and-eat protein bowls and meals ready in under 3 minutes.',
    category: 'Food',
  },
  'door dash': {
    tagline: 'On-Demand Restaurant & Food Delivery',
    whatTheyDo: 'DoorDash connects students with on-demand food delivery from local restaurants and grocery stores.',
    category: 'Food',
  },
  'doordash': {
    tagline: 'On-Demand Restaurant & Food Delivery',
    whatTheyDo: 'DoorDash connects students with on-demand food delivery from local restaurants and grocery stores.',
    category: 'Food',
  },
  'swig': {
    tagline: 'Custom Dirty Sodas & Sweet Treats',
    whatTheyDo: 'Swig is Utah’s home of custom dirty sodas, refreshing energy infusions, and fresh-baked cookies.',
    category: 'Food',
  },
  'brick oven': {
    tagline: 'Hearth-Baked Pizza & Pasta in Provo',
    whatTheyDo: 'Brick Oven is a beloved Provo pizzeria right across from BYU campus known for its hearth-baked pizzas, pasta, and student discounts.',
    category: 'Food',
    categories: ['Food'],
  },
  'slab pizza': {
    tagline: 'Giant Slice Campus Pizza in Provo',
    whatTheyDo: 'Slab Pizza crafts oversized, uniquely topped square pizza slabs right near the BYU campus.',
    category: 'Food',
  },
  'cupbop korean bbq': {
    tagline: 'Korean BBQ in a Cup Bowls',
    whatTheyDo: 'Cupbop serves fast-casual Korean BBQ bowls with noodles, rice, crisp cabbage, and signature sauces.',
    category: 'Food',
  },
  'cupbop': {
    tagline: 'Korean BBQ in a Cup Bowls',
    whatTheyDo: 'Cupbop serves fast-casual Korean BBQ bowls with noodles, rice, crisp cabbage, and signature sauces.',
    category: 'Food',
  },
  'jcw’s the burger boys': {
    tagline: 'Thick Burgers, Fries & Shakes',
    whatTheyDo: 'JCW’s serves charbroiled gourmet burgers, hand-cut french fries, and thick ice cream shakes.',
    category: 'Food',
  },
  'hruska’s kolaches': {
    tagline: 'Fresh Breakfast & Sweet Pastries',
    whatTheyDo: 'Hruska’s Kolaches bakes warm, scratch-made savory breakfast kolaches and fruit-filled Czech pastries.',
    category: 'Food',
  },
  'the wall byu': {
    tagline: 'WSC Student Diner & Live Stage',
    whatTheyDo: 'The Wall is BYU’s student eatery in the Wilkinson Center offering burgers, nachos, and open-mic nights.',
    category: 'Food',
  },
  'byu store': {
    tagline: 'Campus Tech, Books & Cougar Gear',
    whatTheyDo: 'The BYU Store is the official campus retailer for Apple hardware, textbooks, and BYU Cougar apparel.',
    category: 'Tech',
  },
  'disneyland® resort - california': {
    tagline: 'Disneyland & California Adventure Passes',
    whatTheyDo: 'MemberDeals offers student vacation discounts to Disneyland Park and Disney California Adventure.',
    category: 'Travel',
  },
  'walt disney world® resort': {
    tagline: 'Disney World Theme Park Passes',
    whatTheyDo: 'Special student admission pricing to Magic Kingdom, EPCOT, Hollywood Studios, and Animal Kingdom.',
    category: 'Travel',
  },
  'universal orlando resort': {
    tagline: 'Universal Studios Florida Theme Parks',
    whatTheyDo: 'Discounted student admissions to Universal Studios, Islands of Adventure, and Volcano Bay.',
    category: 'Travel',
  },
  'universal studios hollywood memberdeals': {
    tagline: 'Universal Hollywood Studio Tours & Rides',
    whatTheyDo: 'Student tickets for Universal Studios Hollywood studio backlot tours and Super Nintendo World.',
    category: 'Travel',
  },
  'san diego zoo': {
    tagline: 'San Diego Zoo & Safari Park',
    whatTheyDo: 'Discounted student tickets to the world-renowned San Diego Zoo wildlife conservation parks.',
    category: 'Travel',
  },
  'theme parks': {
    tagline: 'Nationwide Theme Park Admissions',
    whatTheyDo: 'Exclusive student discount tickets for amusement parks and roller coasters across the US.',
    category: 'Travel',
  },
  'dollywood memberdeals': {
    tagline: 'Dollywood Roller Coasters & Waterpark',
    whatTheyDo: 'Special student ticket discounts for Dollywood theme park rides and Splash Country water park.',
    category: 'Travel',
  },
  'ikon pass': {
    tagline: 'Multi-Resort Season Ski & Snowboard Pass',
    whatTheyDo: 'The Ikon Pass provides college students discounted season ski access to Deer Valley, Brighton, and Solitude.',
    category: 'Travel',
  },
  'away': {
    tagline: 'Hard-Shell Polycarbonate Luggage',
    whatTheyDo: 'Away designs durable hard-shell suitcases, expandable carry-ons, and travel weekender bags.',
    category: 'Travel',
  },
  'hotels.com': {
    tagline: 'Worldwide Hotel & Lodging Bookings',
    whatTheyDo: 'Hotels.com allows students to search, compare, and book discounted hotels and vacation stays globally.',
    category: 'Travel',
  },
  'expedia': {
    tagline: 'Flights, Hotels & Vacation Packages',
    whatTheyDo: 'Expedia offers student travel rates on airline tickets, hotel stays, rental cars, and vacation bundles.',
    category: 'Travel',
  },
  'travelocity': {
    tagline: 'Travel Bookings & Vacation Lodgings',
    whatTheyDo: 'Travelocity provides price-match guaranteed flights, hotels, and vehicle rentals for college travelers.',
    category: 'Travel',
  },
  'vrbo': {
    tagline: 'Vacation Home & Cabin Rentals',
    whatTheyDo: 'Vrbo provides whole-home vacation rentals, beach houses, ski chalets, and mountain cabins for group trips.',
    category: 'Travel',
  },
  'memberdeals hotels': {
    tagline: 'Exclusive Student Hotel Portal',
    whatTheyDo: 'MemberDeals delivers negotiated corporate and collegiate hotel discounts at resorts across the country.',
    category: 'Travel',
  },
  'las vegas hotels': {
    tagline: 'Las Vegas Strip Resort Bookings',
    whatTheyDo: 'Discounted collegiate rates on iconic hotels, casino resorts, and suites along the Las Vegas Strip.',
    category: 'Travel',
  },
  'anaheim hotels': {
    tagline: 'Disneyland Area Hotel Bookings',
    whatTheyDo: 'Affordable hotel stays and family suites located within walking distance of the Disneyland Resort.',
    category: 'Travel',
  },
  'new york hotels': {
    tagline: 'New York City Hotel Accommodations',
    whatTheyDo: 'Discounted student lodging across Manhattan, Brooklyn, and Times Square in New York City.',
    category: 'Travel',
  },
  'caesars palace': {
    tagline: 'Las Vegas Luxury Casino Resort',
    whatTheyDo: 'Caesars Palace offers student discounts on hotel rooms, world-class pools, and dining on the Strip.',
    category: 'Travel',
  },
  'caesars rewards': {
    tagline: 'Resort Stays & Entertainment Rewards',
    whatTheyDo: 'Caesars Rewards offers student discount rates across Harrah’s, Flamingo, Linq, and Caesars resorts.',
    category: 'Travel',
  },
  'untuckit': {
    tagline: 'Collared Shirts Designed to Be Untucked',
    whatTheyDo: 'UNTUCKit designs casual and dress button-down shirts tailored to the perfect length to wear untucked.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'southern tide': {
    tagline: 'Coastal Collegiate & Prep Fashion',
    whatTheyDo: 'Southern Tide crafts coastal-inspired collegiate apparel, performance polos, and tailored shorts.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'tuckernuck': {
    tagline: 'Classic Boutique Apparel & Lifestyle',
    whatTheyDo: 'Tuckernuck offers classic American boutique clothing, collegiate fashion, and preppy accessories.',
    category: 'Apparel',
    categories: ['Apparel'],
  },
  'lenscrafters': {
    tagline: 'Prescription Glasses, Lenses & Frames',
    whatTheyDo: 'LensCrafters provides comprehensive eye exams, prescription designer frames, and premium optical lenses.',
    category: 'Fitness',
  },
  'lensdirect': {
    tagline: 'Discount Contact Lenses & Eyewear',
    whatTheyDo: 'LensDirect delivers affordable prescription contact lenses, replacement lenses, and optical supplies.',
    category: 'Fitness',
  },
  'contactsdirect': {
    tagline: 'Online Contact Lens Delivery',
    whatTheyDo: 'ContactsDirect delivers name-brand contact lenses (Acuvue, Biofinity, Dailies) with insurance acceptance.',
    category: 'Fitness',
  },
  'zenni optical': {
    tagline: 'Affordable Custom Prescription Glasses',
    whatTheyDo: 'Zenni Optical provides high-quality, ultra-affordable prescription eyeglasses starting at under $10.',
    category: 'Fitness',
  },
  'sunglass hut': {
    tagline: 'Designer Sunglasses & Eyewear',
    whatTheyDo: 'Sunglass Hut is a global retailer for luxury and athletic sunglasses including Ray-Ban, Oakley, and Prada.',
    category: 'Fitness',
  },
  'quest': {
    tagline: 'Clinical Lab Testing & Health Panels',
    whatTheyDo: 'Quest Diagnostics offers direct-to-consumer lab testing, health screenings, and routine blood tests.',
    category: 'Fitness',
  },
  'github': {
    tagline: 'Developer Platform & AI Pair Programmer',
    whatTheyDo: 'GitHub provides code hosting, CI/CD pipelines, and GitHub Copilot for student software engineers.',
    category: 'AI',
  },
  'perplexity': {
    tagline: 'Conversational AI Search Engine',
    whatTheyDo: 'Perplexity is an AI-powered conversational search engine offering citation-backed answers and research models.',
    category: 'AI',
    categories: ['AI', 'Tech'],
  },
  'notion': {
    tagline: 'Connected Workspace & Notion AI',
    whatTheyDo: 'Notion is an all-in-one collaborative workspace for note-taking, project docs, databases, and AI summaries.',
    category: 'AI',
  },
  'figma': {
    tagline: 'Collaborative Interface & UX Design',
    whatTheyDo: 'Figma is the industry-standard collaborative vector design and prototyping software used by modern tech teams.',
    category: 'Tech',
  },
  'jetbrains': {
    tagline: 'Professional Developer IDE Suite',
    whatTheyDo: 'JetBrains creates world-class IDEs including IntelliJ IDEA, PyCharm, WebStorm, and CLion for software engineers.',
    category: 'Tech',
  },
  'spotify': {
    tagline: 'Music Streaming & Hulu Bundle',
    whatTheyDo: 'Spotify is the world’s leading music and podcast streaming service with discounted student premium bundles.',
    category: 'Subscription',
  },
  'apple': {
    tagline: 'Mac, iPad & Apple Music Student Bundle',
    whatTheyDo: 'Apple manufactures MacBooks, iPads, and software, offering discounted student hardware and Apple Music + TV+.',
    category: 'Tech',
  },
  'amazon': {
    tagline: 'Prime Delivery & Streaming Service',
    whatTheyDo: 'Amazon Prime Student provides free fast 2-day shipping, Prime Video, and digital entertainment perks.',
    category: 'Subscription',
  },
  'adobe': {
    tagline: 'Creative Cloud & Generative Firefly',
    whatTheyDo: 'Adobe develops industry-leading creative tools including Photoshop, Illustrator, Premiere Pro, and Firefly AI.',
    category: 'Tech',
  },
  'microsoft': {
    tagline: 'Office 365, Cloud & Copilot Tools',
    whatTheyDo: 'Microsoft provides productivity applications including Word, Excel, PowerPoint, OneDrive, and Azure cloud credits.',
    category: 'Tech',
  },
  'google': {
    tagline: 'Gemini AI & Cloud Productivity',
    whatTheyDo: 'Google delivers Gemini Advanced AI models, 2TB Google One storage, and Workspace AI integrations.',
    category: 'AI',
  },
  'openai': {
    tagline: 'ChatGPT & Generative AI Models',
    whatTheyDo: 'OpenAI develops ChatGPT, GPT-4o, and conversational AI tools for writing, coding, and academic research.',
    category: 'AI',
    categories: ['AI', 'Tech'],
  },
  'google cloud': {
    tagline: 'Cloud Computing & Vertex AI',
    whatTheyDo: 'Google Cloud provides scalable infrastructure, BigQuery analytics, Vertex AI machine learning, and student lab credits.',
    category: 'AI',
    categories: ['AI', 'Tech'],
  },
  'tableau': {
    tagline: 'Analytics & Business Intelligence',
    whatTheyDo: 'Tableau delivers visual analytics, business intelligence dashboards, and data exploration tools.',
    category: 'Tech',
  },
  'termius': {
    tagline: 'Cross-Platform SSH Client & SFTP',
    whatTheyDo: 'Termius is a secure SSH client and terminal workspace for managing remote Linux servers and cloud infrastructure.',
    category: 'Tech',
  },
  'namecheap': {
    tagline: 'Domain Names & SSL Certificates',
    whatTheyDo: 'Namecheap offers domain name registration, free .me domains, SSL certificates, and web hosting for students.',
    category: 'Tech',
  },
  'mongodb': {
    tagline: 'Document Database & Atlas Cloud',
    whatTheyDo: 'MongoDB provides modern flexible document databases and cloud database credits for student developers.',
    category: 'Tech',
  },
  'frontend masters': {
    tagline: 'Expert Web Development Courses',
    whatTheyDo: 'Frontend Masters provides in-depth technical courses on JavaScript, React, TypeScript, and full-stack engineering.',
    category: 'Tech',
  },
  'datacamp': {
    tagline: 'Data Science & Machine Learning Courses',
    whatTheyDo: 'DataCamp provides hands-on interactive courses covering Python, SQL, machine learning, and data analytics.',
    category: 'Tech',
  },
  'canva': {
    tagline: 'Visual Design & Magic Studio AI',
    whatTheyDo: 'Canva offers intuitive graphic design, presentations, and AI-powered Magic Studio image editing.',
    category: 'Tech',
  },
};

/**
 * Normalize company name for lookup
 */
export function normalizeCompany(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[®™]/g, '')
    .trim();
}

/**
 * Get company knowledge object
 */
export function getCompanyCatalogEntry(name: string): CompanyCatalogEntry | null {
  const norm = normalizeCompany(name);
  if (COMPANY_CATALOG[norm]) return COMPANY_CATALOG[norm];

  for (const [key, val] of Object.entries(COMPANY_CATALOG)) {
    // If key is short (<= 4 chars like 'on', 'aaa'), use strict word boundary
    if (key.length <= 4) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(norm)) {
        return val;
      }
      continue;
    }

    if (norm.includes(key) || key.includes(norm)) {
      return val;
    }
  }
  return null;
}

/**
 * Generate a rich, descriptive deal description combining company info with the offer
 */
/**
 * Strip repetitive "for students" and robotic promo phrases
 */
export function cleanOfferText(text: string): string {
  if (!text) return "";
  let s = text.trim();

  // Strip robotic prefix introductions
  s = s.replace(/^Students unlock special savings:\s*/i, "");
  s = s.replace(/^[A-Za-z0-9\s'&®.-]+ provides exclusive student discounts:\s*/i, "");

  // Strip regional student specifiers
  s = s.replace(/\s*for\s+(?:u\.s\.\s*(?:and|&)\s*)?canadian\s+students\.?/gi, "");
  s = s.replace(/\s*for\s+u\.s\.\s+students\.?/gi, "");

  // Strip redundant "for students", "for college students", "for university students"
  s = s.replace(/\s*for\s+(?:university|college|enrolled)?\s*students\.?/gi, "");

  // Clean redundant Student save phrasing
  s = s.replace(/Students save an extra/gi, "Save an extra");
  s = s.replace(/Students save/gi, "Save");
  s = s.replace(/Cash back for Students/gi, "Cash back");
  s = s.replace(/Discounts for Students/gi, "Exclusive discount");

  // Fix punctuation and double spaces
  s = s.replace(/\s+\./g, ".");
  s = s.replace(/\.\.+/g, ".");
  s = s.replace(/\s\s+/g, " ");
  s = s.trim();

  return s;
}

export function buildEnrichedDescription(company: string, rawTitle?: string, rawDesc?: string): string {
  const entry = getCompanyCatalogEntry(company);
  const cleanTitle = cleanOfferText(rawTitle || '');
  let cleanDesc = cleanOfferText(rawDesc || '');

  // If the company has a catalog entry
  if (entry) {
    // Deduplicate if whatTheyDo was already prepended
    if (cleanDesc.includes(entry.whatTheyDo)) {
      while (cleanDesc.includes(`${entry.whatTheyDo} ${entry.whatTheyDo}`)) {
        cleanDesc = cleanDesc.replace(`${entry.whatTheyDo} ${entry.whatTheyDo}`, entry.whatTheyDo);
      }
      return cleanDesc;
    }

    const isGeneric =
      /cash back|exclusive discount|save up to|^save/i.test(cleanDesc) ||
      cleanDesc.length < 25 ||
      cleanDesc.toLowerCase() === cleanTitle.toLowerCase();

    if (isGeneric && cleanTitle) {
      return `${entry.whatTheyDo} ${cleanTitle}.`.replace(/\.\./g, '.');
    }

    if (cleanDesc && !cleanDesc.toLowerCase().includes(entry.tagline.toLowerCase().split(' ')[0])) {
      return `${entry.whatTheyDo} ${cleanDesc}`.replace(/\.\./g, '.');
    }
    return cleanDesc || entry.whatTheyDo;
  }

  if (cleanDesc && cleanDesc.length > 20 && cleanDesc.toLowerCase() !== cleanTitle.toLowerCase()) {
    return cleanDesc;
  }
  return cleanTitle ? `${cleanTitle}.` : `Special student savings available.`;
}
