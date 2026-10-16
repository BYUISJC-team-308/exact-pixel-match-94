export type Deal = {
  id: string;
  title: string;
  company: string;
  category: "Food" | "Tech" | "AI" | "Subscription" | "Groceries" | "Print" | "Fitness" | "Travel";
  type: "Percent off" | "Free" | "Fixed price";
  value: string;
  description: string;
  howTo: string;
  duration: string;
  url: string;
  isNew?: boolean;
};

export const deals: Deal[] = [
  { id: "d1", title: "FreshCart student cart", company: "FreshCart", category: "Groceries", type: "Percent off", value: "−20%", description: "20% off your first basket when you verify your .edu email.", howTo: "Verify your .edu email in the FreshCart app, discount applies at checkout.", duration: "Through Dec 31", url: "https://example.com/freshcart", isNew: true },
  { id: "d2", title: "InkWell copy centre", company: "InkWell", category: "Print", type: "Percent off", value: "−35%", description: "35% off all printing and binding.", howTo: "Show your student ID at the front desk.", duration: "Ongoing", url: "https://example.com/inkwell" },
  { id: "d3", title: "Nimbus Cloud storage", company: "Nimbus", category: "Subscription", type: "Fixed price", value: "$1.99/mo", description: "2TB student plan with offline sync.", howTo: "Sign up with your school email on the student plan page.", duration: "While enrolled", url: "https://example.com/nimbus" },
  { id: "d4", title: "Copilot AI Pro for students", company: "CodeHelper", category: "AI", type: "Free", value: "Free", description: "Pro AI coding assistant free for verified students.", howTo: "Apply through the student developer pack.", duration: "1 year, renewable", url: "https://example.com/ai", isNew: true },
  { id: "d5", title: "Streamly Student", company: "Streamly", category: "Subscription", type: "Percent off", value: "−50%", description: "Half-price music + video bundle.", howTo: "Verify enrollment via the Streamly student page.", duration: "Up to 4 years", url: "https://example.com/streamly" },
  { id: "d6", title: "Laptop education pricing", company: "PixelWorks", category: "Tech", type: "Percent off", value: "−10%", description: "Education pricing on laptops and tablets.", howTo: "Shop through the education store and verify.", duration: "Ongoing", url: "https://example.com/pixel" },
  { id: "d7", title: "Write-anything AI", company: "Scribe AI", category: "AI", type: "Percent off", value: "−60%", description: "60% off the annual plan of the writing assistant.", howTo: "Use code STUDENT60 at checkout.", duration: "Ends Nov 30", url: "https://example.com/scribe", isNew: true },
  { id: "d8", title: "Railpass youth fare", company: "MetroRail", category: "Travel", type: "Percent off", value: "−25%", description: "25% off weekend rail tickets.", howTo: "Add your student card to your MetroRail account.", duration: "Ongoing", url: "https://example.com/rail" },
  { id: "d9", title: "Peak Gym first month", company: "Peak Gym", category: "Fitness", type: "Free", value: "Free", description: "First month free with a student ID.", howTo: "Bring your ID to the front desk.", duration: "New members only", url: "https://example.com/peak" },
  { id: "d10", title: "Taco Loco student combo", company: "Taco Loco", category: "Food", type: "Fixed price", value: "$5", description: "Two tacos, chips and a drink for five bucks.", howTo: "Show your student ID when ordering.", duration: "Mon–Thu", url: "https://example.com/taco" },
];

export type SSDeal = {
  id: string;
  company: string;
  item: string;
  type: "Free" | "Discount";
  value: string;
  category: "Food" | "Coffee" | "Entertainment" | "Services";
  address: string;
  details: string;
  x: number; // map %
  y: number;
};

export const ssDeals: SSDeal[] = [
  { id: "s1", company: "The Grind", item: "Free drip coffee", type: "Free", value: "Free", category: "Coffee", address: "120 College Ave", details: "One free small drip coffee. Card punched once.", x: 22, y: 30 },
  { id: "s2", company: "Slice House", item: "Buy one slice, get one", type: "Free", value: "BOGO", category: "Food", address: "48 Main St", details: "Buy any slice and get a second free.", x: 40, y: 62 },
  { id: "s3", company: "Burger Barn", item: "Free fries with burger", type: "Free", value: "Free", category: "Food", address: "300 University Blvd", details: "Free regular fries with any burger.", x: 70, y: 24 },
  { id: "s4", company: "Cinema 8", item: "Matinee ticket", type: "Discount", value: "−50%", category: "Entertainment", address: "9 Plaza Dr", details: "Half off any matinee before 5pm.", x: 82, y: 70 },
  { id: "s5", company: "Fresh Cuts", item: "Haircut", type: "Discount", value: "−30%", category: "Services", address: "77 Elm St", details: "30% off any standard cut.", x: 15, y: 75 },
  { id: "s6", company: "Boba Bar", item: "Large boba", type: "Discount", value: "$2 off", category: "Coffee", address: "15 Center St", details: "$2 off any large drink.", x: 55, y: 40 },
  { id: "s7", company: "Bowl Zone", item: "One free game", type: "Free", value: "Free", category: "Entertainment", address: "500 Lane Rd", details: "One free game of bowling, shoes not included.", x: 62, y: 84 },
  { id: "s8", company: "Wrap Stop", item: "Any wrap", type: "Discount", value: "−20%", category: "Food", address: "210 Oak St", details: "20% off any wrap.", x: 33, y: 15 },
];

export type FoodEvent = {
  id: string;
  title: string;
  host: string;
  food: string;
  dayOffset: number;
  start: string;
  end: string;
  building: string;
  room: string;
  details: string;
  x: number;
  y: number;
};

//this should break the page
export const foodEvents: FoodEvent [] = [
  
  /*
  { id: "e1", title: "Free pizza night", host: "Student Union", food: "Pizza", dayOffset: 0, start: "12:00", end: "13:00", building: "Student Union", room: "Rm 204", details: "Cheese & veggie pizza while it lasts.", x: 45, y: 48 },
  { id: "e2", title: "Smoothie samples", host: "Wellness Center", food: "Smoothies", dayOffset: 0, start: "14:30", end: "15:30", building: "Main Quad", room: "Outdoor tent", details: "Free smoothie samples and healthy snacks.", x: 50, y: 30 },
  { id: "e3", title: "Free dumplings", host: "Asian Student Assoc.", food: "Dumplings", dayOffset: 0, start: "17:00", end: "18:30", building: "Night Market Lot", room: "Booth 3", details: "Homemade dumplings at the cultural night market.", x: 75, y: 50 },
  { id: "e4", title: "Bagel breakfast", host: "Engineering Club", food: "Bagels & coffee", dayOffset: 1, start: "08:30", end: "10:00", building: "Engineering Hall", room: "Lobby", details: "Bagels, cream cheese, and coffee.", x: 28, y: 52 },
  { id: "e5", title: "Taco Tuesday social", host: "Latinx Union", food: "Tacos", dayOffset: 2, start: "18:00", end: "20:00", building: "Student Union", room: "Ballroom", details: "Free tacos, music, and games.", x: 47, y: 55 },
  { id: "e6", title: "Food pantry open", host: "Campus Pantry", food: "Groceries", dayOffset: 3, start: "10:00", end: "16:00", building: "East Gate", room: "Rm 101", details: "Take what you need, no ID required.", x: 88, y: 40 },
  { id: "e7", title: "Cookie study break", host: "Library", food: "Cookies & milk", dayOffset: 4, start: "20:00", end: "21:00", building: "Main Library", room: "2nd floor", details: "Fresh cookies during finals prep.", x: 20, y: 44 },
  { id: "e8", title: "BBQ on the lawn", host: "Rec Sports", food: "Burgers & hot dogs", dayOffset: 6, start: "12:00", end: "14:00", building: "Rec Lawn", room: "Outdoors", details: "Free BBQ, veggie options available.", x: 65, y: 70 },
  { id: "e9", title: "Leftover catering", host: "Business School", food: "Sandwiches", dayOffset: 9, start: "15:00", end: "16:00", building: "Business Bldg", room: "Rm 310", details: "Leftover catering from a career fair.", x: 35, y: 78 },
*/];

export function eventDate(e: FoodEvent) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + e.dayOffset);
  return d;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const siteSections = [
  { to: "/", label: "Home", desc: "Your hub and today's events" },
  { to: "/discounts", label: "Discount Dashboard", desc: "Browse, filter and save student discounts" },
  { to: "/starving-student", label: "Starving Student Hub", desc: "Card deals and tracking which you've used" },
  { to: "/free-food", label: "Free Food Near Me", desc: "Free food on campus today and this week" },
  { to: "/calendar", label: "Calendar", desc: "Free food events by date" },
  { to: "/map", label: "Interactive Map", desc: "Discount and free food locations" },
  { to: "/profile", label: "Profile", desc: "Your account and info" },
  { to: "/account", label: "Create Account", desc: "Sign up to save deals and events" },
] as const;
