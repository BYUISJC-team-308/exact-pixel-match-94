import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("VITE_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1].trim();
    }
    if (trimmed.startsWith("VITE_SUPABASE_ANON_KEY=")) {
      supabaseAnonKey = trimmed.split("=")[1].trim();
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment or .env at:", envPath);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

const baselineEvents = [
  {
    title: "BYU Computing & AI Social",
    host: "BYU Computer Science & ACM",
    food: "Brick Oven Pizza & Italian Sodas",
    event_date: getFutureDate(0), // Today
    start_time: "12:00:00",
    end_time: "13:30:00",
    building: "TMCB (Talmage Building)",
    room: "Rm 1170 (Main Lab)",
    details: "Meet professors, connect with peers, and grab free Brick Oven pizza while supplies last."
  },
  {
    title: "Student Wellness Smoothie Bowls & Fruit",
    host: "BYU Student Wellness & Peer Nutrition",
    food: "Açaí Bowls, Smoothies & Fruit",
    event_date: getFutureDate(0), // Today
    start_time: "14:30:00",
    end_time: "16:00:00",
    building: "WSC (Wilkinson Student Center)",
    room: "Terrace Garden Room",
    details: "Free smoothie bar and healthy study snacks to kick off midterm prep week."
  },
  {
    title: "BYU Marriott School Donut & Coffee Social",
    host: "Marriott School Undergraduate Assoc.",
    food: "Fresh Donuts, Pastries & Drinks",
    event_date: getFutureDate(1), // Tomorrow
    start_time: "09:00:00",
    end_time: "10:30:00",
    building: "TNRB (Tanner Building)",
    room: "1st Floor Atrium",
    details: "Free fresh pastries and donuts for business & pre-management students."
  },
  {
    title: "Utah County Student Taco Night",
    host: "Provo Downtown Student Alliance",
    food: "Street Tacos (Carnitas, Chicken, Veggie)",
    event_date: getFutureDate(2),
    start_time: "18:00:00",
    end_time: "20:00:00",
    building: "Provo Town Square Pavilion",
    room: "Center Stage Courtyard",
    details: "Downtown Provo local community event. Free tacos with valid college student ID."
  },
  {
    title: "Engineering Finals Boost Bagel Bar",
    host: "Ira A. Fulton College of Engineering",
    food: "Bagels, Cream Cheese & Hot Cocoa",
    event_date: getFutureDate(3),
    start_time: "08:30:00",
    end_time: "10:30:00",
    building: "EB (Engineering Building)",
    room: "Student Collaboration Hub",
    details: "Fuel up before morning lectures. Gluten-free bagel options provided."
  },
  {
    title: "Cougar Spirit Saturday Pancake Breakfast",
    host: "BYU Athletics & ROC Board",
    food: "Buttermilk Pancakes, Syrups & Bacon",
    event_date: getFutureDate(5),
    start_time: "09:00:00",
    end_time: "11:00:00",
    building: "Smith Fieldhouse (SFH)",
    room: "West Entrance Lawn",
    details: "Free game-day breakfast for BYU students wearing royal blue."
  }
];

async function ingest() {
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  console.log(`Ingesting ${baselineEvents.length} baseline campus/Utah County food events...`);

  const { data: insertData, error: insertError } = await supabase
    .from("food_events")
    .insert(baselineEvents)
    .select();

  if (insertError) {
    console.error("Failed to insert food events:", insertError);
    process.exit(1);
  }
  console.log(`Successfully inserted ${insertData?.length || 0} events!`);
}

ingest();
