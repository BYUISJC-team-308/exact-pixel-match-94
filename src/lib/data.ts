export type DealCategory =
  | "Food"
  | "Tech"
  | "AI"
  | "Apparel"
  | "Subscription"
  | "Groceries"
  | "Print"
  | "Fitness"
  | "Travel";

export type Deal = {
  id: string;
  title: string;
  company: string;
  category: DealCategory;
  categories?: DealCategory[];
  type: "Percent off" | "Free" | "Fixed price";
  value: string;
  description: string;
  howTo: string;
  duration: string;
  url: string;
  isNew?: boolean;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

// Real deals are fetched dynamically from Supabase database (deals table)
export const deals: Deal[] = [];

export type SSDeal = {
  id: string;
  company: string;
  item: string;
  type: "Free" | "Discount";
  value: string;
  category: string;
  address: string;
  details: string;
  x: number; // map %
  y: number;
  sourceUrl: string;
  capturedAt: string;
  totalUses?: number | null;
  locations: { address: string; city: string; lat: number; lng: number }[];
};

// Offer records are fetched from Supabase at runtime.
export const ssDeals: SSDeal[] = [];

export type FoodEvent = {
  id: string;
  title: string;
  host: string;
  food: string;
  dayOffset: number;
  start: string;
  end: string;
  building: string;
  buildingId?: string;
  room: string;
  details: string;
  x: number;
  y: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  locationNote?: string;
};

// Real food events are loaded live from Supabase (food_events table)
export const foodEvents: FoodEvent[] = [];

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
  { to: "/account", label: "Create Account", desc: "Create your student profile" },
] as const;
