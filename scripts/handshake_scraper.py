"""
Handshake Safe Playwright Scraper & Auto-Sync
============================================
Safely scrapes BYU Handshake events, filters for free food, and automatically
adds brand-new unique events directly into your live Supabase database.

Features:
  - Session-aware: Uses authenticated session from storage_state.json
  - Safe pacing: Randomized human delays (1.2–2.0s) & genuine Chrome fingerprint
  - Smart deduplication: Fuzzy & clean-title matching against live Supabase events
  - Auto-enrichment: Automatically resolves BYU building coordinates & campus IDs
  - Immediate publishing: Inserts new events into Supabase so they appear live

Usage:
  # One-time login
  python scripts/handshake_scraper.py --login

  # Scrape & automatically add new free food events to the website
  python scripts/handshake_scraper.py --scrape --pages 2

  # Dry run (scrape & save to JSON/CSV without inserting into Supabase)
  python scripts/handshake_scraper.py --scrape --no-sync
"""

import argparse
import csv
import json
import os
import random
import re
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
SESSION_DIR = ROOT_DIR / "handshake_session"
STORAGE_STATE_PATH = SESSION_DIR / "storage_state.json"
OUTPUT_DIR = ROOT_DIR / "data" / "handshake"
BUILDINGS_JSON_PATH = ROOT_DIR / "src" / "lib" / "byu-buildings.json"

HANDSHAKE_BASE_URL = "https://byu.joinhandshake.com"
EVENTS_URL = f"{HANDSHAKE_BASE_URL}/stu/events?collection=ALL&eventFormat=HYBRID&sort=RELEVANCE&date=ALL"

CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

SUPABASE_URL = "https://zwygwfcaollyotvfwumx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg"

VALID_DB_COLUMNS = {
    "title", "host", "food", "event_date", "start_time", "end_time",
    "building", "building_id", "campus_id", "room", "details", "address",
    "latitude", "longitude", "location_note", "verification_status",
    "upvotes_count", "real_votes_count", "fake_votes_count"
}

GET_EVENT_QUERY = """
query GetEvent($id: ID!) {
  event(id: $id) {
    id
    name
    description
    startDate
    endDate
    room {
      name
      building {
        name
      }
    }
    host {
      name
    }
  }
}
"""

FOOD_KEYWORDS = [
    "food", "pizza", "lunch", "dinner", "breakfast", "donut", "donuts",
    "catered", "catering", "snack", "snacks", "refreshment", "refreshments",
    "taco", "tacos", "treat", "treats", "cookie", "cookies", "ice cream",
    "boba", "drinks", "beverage", "bbq", "barbecue", "bagel", "bagels",
    "pancake", "pancakes", "pie", "crepes", "buffet", "eat", "meal"
]


def ensure_directories():
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def polite_delay(min_sec=3.0, max_sec=5.5, msg="Pacing safely..."):
    delay = random.uniform(min_sec, max_sec)
    print(f"[*] {msg} (waiting {delay:.1f}s)")
    time.sleep(delay)


def load_building_directory():
    """Loads official BYU building coordinates and codes."""
    if BUILDINGS_JSON_PATH.exists():
        try:
            with open(BUILDINGS_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def run_login():
    """Interactive headful login to BYU Handshake."""
    ensure_directories()
    print("\n" + "=" * 65)
    print("HANDSHAKE INTERACTIVE LOGIN")
    print("=" * 65)
    print("1. Opening browser window to BYU Handshake...")
    print("2. Enter your BYU NetID, password, and Duo 2FA.")
    print("3. When you see your Handshake dashboard, press ENTER in the terminal.")
    print("=" * 65 + "\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent=CHROME_UA,
            viewport={"width": 1280, "height": 850}
        )
        page = context.new_page()
        page.goto(HANDSHAKE_BASE_URL)

        try:
            input("\n>>> Press ENTER here in the terminal AFTER you have logged in... ")
        except EOFError:
            time.sleep(45)

        context.storage_state(path=str(STORAGE_STATE_PATH))
        print(f"\n[+] Auth session successfully saved to:\n    {STORAGE_STATE_PATH}")
        browser.close()


def detect_food_offering(title, description):
    combined = f"{title or ''} {description or ''}".lower()
    matches = [k for k in FOOD_KEYWORDS if re.search(r'\b' + re.escape(k) + r'\b', combined)]

    if not matches:
        return None

    if "pizza" in matches:
        return "Pizza provided"
    if "lunch" in matches:
        return "Lunch provided"
    if "dinner" in matches:
        return "Dinner provided"
    if "breakfast" in matches or "pancake" in matches or "bagel" in matches:
        return "Breakfast provided"
    if "taco" in matches or "tacos" in matches:
        return "Tacos provided"
    if "ice cream" in matches:
        return "Ice cream provided"
    if "donut" in matches or "donuts" in matches or "cookie" in matches or "cookies" in matches:
        return "Donuts & sweet treats provided"
    if "refreshment" in matches or "refreshments" in matches:
        return "Refreshments & snacks provided"
    if "snack" in matches or "snacks" in matches:
        return "Snacks provided"

    return "Free food provided"


def clean_title_for_comparison(title):
    if not title:
        return ""
    # Strip tagline additions like '| Free Food...' or '| Networking'
    base = re.split(r'\s*\|\s*(?:free food|networking|info session)', title, flags=re.IGNORECASE)[0]
    clean = re.sub(r'[^a-z0-9\s]', '', base.lower())
    return ' '.join(clean.split())


def fetch_existing_events():
    """Queries current food_events from Supabase for deduplication."""
    try:
        url = f"{SUPABASE_URL}/rest/v1/food_events?select=id,title,event_date,building,room"
        req = urllib.request.Request(
            url,
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Warning: Could not fetch existing DB events for deduplication: {e}")
        return []


def is_duplicate(new_ev, existing_events):
    """Fuzzy and exact comparison to prevent duplicate entries on the same date."""
    new_date = new_ev.get("event_date")
    new_clean = clean_title_for_comparison(new_ev.get("title", ""))

    for ex in existing_events:
        if ex.get("event_date") != new_date:
            continue

        ex_clean = clean_title_for_comparison(ex.get("title", ""))
        if new_clean == ex_clean:
            return True, ex

        if len(new_clean) > 8 and len(ex_clean) > 8:
            if new_clean in ex_clean or ex_clean in new_clean:
                return True, ex
            t1 = set(new_clean.split())
            t2 = set(ex_clean.split())
            common = t1.intersection(t2)
            if len(common) >= 3 and len(common) / min(len(t1), len(t2)) > 0.6:
                return True, ex

    return False, None


def enrich_event_location(event, buildings):
    """Enriches coordinates and formal building names from BYU building records."""
    bldg_code = event.get("building", "")
    for b in buildings:
        if b.get("code") == bldg_code or b.get("label", "").lower() in bldg_code.lower():
            event["latitude"] = b.get("lat")
            event["longitude"] = b.get("lng")
            if b.get("label"):
                event["building"] = f"{b.get('code')} ({b.get('label')})"
            break
    return event


def auto_sync_to_supabase(food_events):
    """
    Checks each scraped event against Supabase.
    If it does not exist, enriches it and inserts it immediately.
    """
    if not food_events:
        return

    print("\n" + "=" * 65)
    print("DEDUPLICATION & AUTO-SYNC TO WEBSITE (SUPABASE)")
    print("=" * 65)

    existing_events = fetch_existing_events()
    buildings = load_building_directory()

    to_insert = []
    for ev in food_events:
        dup, matched = is_duplicate(ev, existing_events)
        if dup:
            print(f"  [-] Duplicate skipped: \"{ev['title']}\" ({ev['event_date']})")
            print(f"      Already in DB: \"{matched['title']}\" (ID: {matched['id']})")
        else:
            enriched = enrich_event_location(dict(ev), buildings)
            # Filter to valid Supabase columns
            clean_row = {k: v for k, v in enriched.items() if k in VALID_DB_COLUMNS}
            to_insert.append(clean_row)
            print(f"  [+] NEW EVENT APPROVED: \"{clean_row['title']}\" on {clean_row['event_date']}")

    if not to_insert:
        print("\n[i] All scraped events are already live on the website. No duplicates inserted.")
        return

    print(f"\n[*] Inserting {len(to_insert)} new unique events into Supabase...")
    try:
        post_url = f"{SUPABASE_URL}/rest/v1/food_events"
        req = urllib.request.Request(
            post_url,
            data=json.dumps(to_insert).encode("utf-8"),
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            inserted = json.loads(resp.read().decode("utf-8"))
            print(f"[+] Successfully published {len(inserted)} new events to the website live!")
            for row in inserted:
                print(f"    ⭐ Live: {row.get('title')} -> {row.get('building')} {row.get('room', '')} ({row.get('event_date')})")
    except Exception as e:
        print(f"[!] Error inserting events into Supabase: {e}")


def run_free_food_scraper(pages=2, headless=True, auto_sync=True):
    ensure_directories()

    if not STORAGE_STATE_PATH.exists():
        print("[-] No storage_state.json found. Run login first:\n    python scripts/handshake_scraper.py --login")
        return

    print("\n" + "=" * 65)
    print("SAFELY SCRAPING BYU HANDSHAKE FOR FREE FOOD EVENTS")
    print(f"Pages: {pages} | Headless: {headless} | Auto-Sync to Website: {auto_sync}")
    print("=" * 65 + "\n")

    captured_nodes = []
    seen_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            storage_state=str(STORAGE_STATE_PATH),
            user_agent=CHROME_UA,
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        def on_response(response):
            if "graphql" in response.url and "application/json" in response.headers.get("content-type", ""):
                try:
                    data = response.json()
                    edges = data.get("data", {}).get("eventAbstractions", {}).get("edges", [])
                    for edge in edges:
                        node = edge.get("node")
                        if node and node.get("id") and node.get("id") not in seen_ids:
                            seen_ids.add(node["id"])
                            captured_nodes.append(node)
                except Exception:
                    pass

        page.on("response", on_response)

        print("[*] Navigating to BYU Handshake Events...")
        page.goto(EVENTS_URL, wait_until="domcontentloaded")
        polite_delay(3.5, 5.0, "Allowing events catalog to load")

        if "login" in page.url:
            print("[-] Session expired. Please re-run login: python scripts/handshake_scraper.py --login")
            browser.close()
            return

        for p_idx in range(1, pages + 1):
            print(f"[*] Reading event catalog page {p_idx} of {pages} (Captured: {len(captured_nodes)} events)...")
            page.mouse.wheel(0, 600)
            time.sleep(1.0)
            page.mouse.wheel(0, 800)
            polite_delay(2.5, 4.0, f"Scanning listings on page {p_idx}")

            next_btn = page.locator("button:has-text('Load more'), button[aria-label='Next page'], [data-hook='pagination-next']").first
            if next_btn.is_visible():
                try:
                    next_btn.click()
                    polite_delay(2.5, 4.0, "Loading next page")
                except Exception:
                    pass

        print(f"\n[+] Total Handshake events in listing: {len(captured_nodes)}")
        print("[*] Verifying food details via in-page GraphQL...")

        verified_food_events = []

        for idx, node in enumerate(captured_nodes, 1):
            eid = node.get("id")
            try:
                res = page.evaluate("""
                    async ({ id, query }) => {
                        const r = await fetch("https://byu.joinhandshake.com/hs/graphql", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                operationName: "GetEvent",
                                variables: { id: id },
                                query: query
                            })
                        });
                        return await r.json();
                    }
                """, {"id": eid, "query": GET_EVENT_QUERY})

                ev_data = res.get("data", {}).get("event")
                if not ev_data:
                    continue

                name = ev_data.get("name", "")
                raw_desc = ev_data.get("description") or ""

                food_offering = detect_food_offering(name, raw_desc)
                if food_offering:
                    normalized = format_to_website_schema(ev_data, food_offering)
                    verified_food_events.append(normalized)
                    print(f"  [{idx}/{len(captured_nodes)}] 🍕 FREE FOOD FOUND: {name}")
                else:
                    print(f"  [{idx}/{len(captured_nodes)}] No food: {name[:50]}")

                time.sleep(random.uniform(1.2, 2.0))

            except Exception as e:
                print(f"  [{idx}/{len(captured_nodes)}] Error inspecting event {eid}: {e}")

        browser.close()

    print(f"\n[+] Verified Free Food Events Captured: {len(verified_food_events)}")
    export_results(verified_food_events)

    if auto_sync:
        auto_sync_to_supabase(verified_food_events)


def format_to_website_schema(ev, food_offering):
    eid = ev.get("id")
    title = ev.get("name", "Campus Event")
    host = (ev.get("host") or {}).get("name") or "BYU Campus Host"

    start_iso = ev.get("startDate")
    end_iso = ev.get("endDate")
    event_date = datetime.now().strftime("%Y-%m-%d")
    start_time = "12:00:00"
    end_time = "13:00:00"

    if start_iso:
        try:
            dt = datetime.fromisoformat(start_iso)
            event_date = dt.strftime("%Y-%m-%d")
            start_time = dt.strftime("%H:%M:%S")
        except Exception:
            pass

    if end_iso:
        try:
            dt_end = datetime.fromisoformat(end_iso)
            end_time = dt_end.strftime("%H:%M:%S")
        except Exception:
            pass

    room_obj = ev.get("room") or {}
    bldg_obj = room_obj.get("building") or {}
    bldg_raw = bldg_obj.get("name") if isinstance(bldg_obj, dict) else ""
    room_raw = room_obj.get("name") or ""

    building = "BYU Campus"
    room = room_raw or "See Handshake"

    if "Wilkinson" in bldg_raw or "WSC" in bldg_raw:
        building = "WSC"
        room = f"WSC {room_raw}" if room_raw and "WSC" not in room_raw else (room_raw or "WSC")
    elif "Tanner" in bldg_raw or "TNRB" in bldg_raw:
        building = "TNRB"
        room = f"TNRB {room_raw}" if room_raw and "TNRB" not in room_raw else (room_raw or "TNRB")
    elif "Engineering" in bldg_raw or "EB" in bldg_raw:
        building = "EB"
        room = f"EB {room_raw}" if room_raw and "EB" not in room_raw else (room_raw or "EB")
    elif "Kimball" in bldg_raw or "JKB" in bldg_raw:
        building = "JKB"
        room = f"JKB {room_raw}" if room_raw and "JKB" not in room_raw else (room_raw or "JKB")
    elif bldg_raw:
        building = bldg_raw

    raw_desc = ev.get("description") or ""
    clean_desc = re.sub(r'<[^>]+>', ' ', raw_desc)
    clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()

    summary = f"{clean_desc[:350]}... (Registration: Go to Handshake to register.)\n\nSource: {HANDSHAKE_BASE_URL}/stu/events/{eid}"

    return {
        "id": f"hs_{eid}",
        "title": title,
        "host": host,
        "food": food_offering,
        "event_date": event_date,
        "start_time": start_time,
        "end_time": end_time,
        "building": building,
        "room": room,
        "details": summary,
        "address": "Brigham Young University, Provo, UT 84602",
        "verification_status": "verified",
        "upvotes_count": 1,
        "real_votes_count": 1,
        "fake_votes_count": 0,
    }


def export_results(food_events):
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    latest_json = OUTPUT_DIR / "latest_free_food_events.json"
    archive_json = OUTPUT_DIR / f"free_food_events_{timestamp}.json"
    archive_csv = OUTPUT_DIR / f"free_food_events_{timestamp}.csv"

    with open(latest_json, "w", encoding="utf-8") as f:
        json.dump(food_events, f, indent=2, ensure_ascii=False)
    with open(archive_json, "w", encoding="utf-8") as f:
        json.dump(food_events, f, indent=2, ensure_ascii=False)

    if food_events:
        with open(archive_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(food_events[0].keys()))
            writer.writeheader()
            writer.writerows(food_events)

    print(f"\n[+] Exported JSON to: {latest_json}")
    if food_events:
        print(f"[+] Exported CSV to:  {archive_csv}")


def main():
    parser = argparse.ArgumentParser(description="Handshake Safe Free Food Scraper & Auto-Sync")
    parser.add_argument("--login", action="store_true", help="Launch interactive login")
    parser.add_argument("--scrape", action="store_true", help="Run the safe scraper")
    parser.add_argument("--pages", type=int, default=2, help="Number of pages to scan (default: 2)")
    parser.add_argument("--headful", action="store_true", help="Run browser visibly")
    parser.add_argument("--no-sync", action="store_true", help="Disable auto-sync to Supabase (dry-run)")

    args = parser.parse_args()

    if args.login:
        run_login()
    elif args.scrape:
        run_free_food_scraper(
            pages=args.pages,
            headless=not args.headful,
            auto_sync=not args.no_sync,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
