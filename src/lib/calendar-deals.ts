export type RecurringSpecial = {
  id: string;
  title: string;
  company: string;
  dealValue: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  dayName: string;
  hours: string;
  location: string;
  description: string;
  category: "tacos" | "wings" | "pizza" | "drinks" | "breakfast";
};

export const RECURRING_SPECIALS: RecurringSpecial[] = [
  {
    id: "spec-mon-1",
    title: "BOGO Burrito Monday",
    company: "Provo Fresh Mexican Grill",
    dealValue: "Buy 1 Get 1 Free",
    dayOfWeek: 1, // Monday
    dayName: "Monday",
    hours: "11:00 AM – 9:00 PM",
    location: "450 N University Ave, Provo",
    description: "Buy any regular burrito and get a second burrito free with valid student ID.",
    category: "tacos",
  },
  {
    id: "spec-tue-1",
    title: "Taco Tuesday — $1.50 Street Tacos",
    company: "Taco Loco & Grill",
    dealValue: "$1.50 per taco",
    dayOfWeek: 2, // Tuesday
    dayName: "Tuesday",
    hours: "All Day (10:30 AM – 10:00 PM)",
    location: "1230 N Canyon Rd, Provo",
    description: "Crispy or soft street tacos with choice of carnitas, chicken, or beans and salsa bar.",
    category: "tacos",
  },
  {
    id: "spec-wed-1",
    title: "Wing Wednesday — 60¢ Wings",
    company: "Cougar Wings & Bites",
    dealValue: "60¢ Traditional / Boneless",
    dayOfWeek: 3, // Wednesday
    dayName: "Wednesday",
    hours: "12:00 PM – 10:00 PM",
    location: "Brick Oven Plaza, Provo",
    description: "60¢ wings in over 10 house sauces with drink purchase. Dine-in only.",
    category: "wings",
  },
  {
    id: "spec-thu-1",
    title: "Thirsty Thursday — $5 Student Meal Combo",
    company: "Provo Downtown Diner",
    dealValue: "$5 Full Combo",
    dayOfWeek: 4, // Thursday
    dayName: "Thursday",
    hours: "11:00 AM – 8:00 PM",
    location: "Center Street, Provo",
    description: "Cheeseburger or crispy chicken sandwich with fries and soda for five dollars.",
    category: "pizza",
  },
  {
    id: "spec-fri-1",
    title: "Cougar Spirit Friday — Free Drink & Treat",
    company: "Campus Creamery Outlet",
    dealValue: "Free Drink with Meal",
    dayOfWeek: 5, // Friday
    dayName: "Friday",
    hours: "11:00 AM – 4:00 PM",
    location: "1200 N 900 E, Provo",
    description: "Wear BYU blue on Fridays and receive a free medium drink or cookie with any food item.",
    category: "drinks",
  },
  {
    id: "spec-sat-1",
    title: "Saturday Pancake Stack Social",
    company: "South Campus Breakfast Club",
    dealValue: "$3.99 Stack",
    dayOfWeek: 6, // Saturday
    dayName: "Saturday",
    hours: "8:00 AM – 12:00 PM",
    location: "University Pkwy, Orem",
    description: "Buttermilk pancake triple stack with maple syrup and butter.",
    category: "breakfast",
  },
];

export function getRecurringSpecialsForDate(d: Date): RecurringSpecial[] {
  const dayOfWeek = d.getDay();
  return RECURRING_SPECIALS.filter((s) => s.dayOfWeek === dayOfWeek);
}
