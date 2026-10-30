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

// Real recurring specials will be populated from verified community & restaurant submissions
export const RECURRING_SPECIALS: RecurringSpecial[] = [];

export function getRecurringSpecialsForDate(d: Date): RecurringSpecial[] {
  const dayOfWeek = d.getDay();
  return RECURRING_SPECIALS.filter((s) => s.dayOfWeek === dayOfWeek);
}
