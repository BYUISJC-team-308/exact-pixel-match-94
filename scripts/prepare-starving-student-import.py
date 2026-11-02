"""Prepare a local CSV for the existing public.ss_deals table.

Run: python3 scripts/prepare-starving-student-import.py INPUT.json /tmp/ss_deals.csv
The source and output contain licensed portal data; keep them out of Git.
"""
import csv
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("Usage: prepare-starving-student-import.py INPUT.json OUTPUT.csv")
source, target = map(Path, sys.argv[1:])
if target.resolve().is_relative_to(Path.cwd().resolve()):
    raise SystemExit("Write the CSV outside the repository, such as /tmp/ss_deals.csv")
offers = json.loads(source.read_text())
if len({offer["id"] for offer in offers}) != len(offers):
    raise SystemExit("Duplicate offer IDs in source")
fields = ["source_key", "company", "item", "deal_type", "value", "category", "address", "details", "source_url", "captured_at", "locations"]
with target.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    for offer in offers:
        text = offer["offer"].strip()
        is_free = offer["category"] == "Freebies" or text.upper().startswith("FREE!")
        writer.writerow({
            "source_key": offer["id"], "company": offer["company"],
            "item": text, "deal_type": "Free" if is_free else "Discount",
            "value": "Free" if is_free else "Offer", "category": offer["category"],
            "address": offer["locations"][0]["address"] if offer["locations"] else "",
            "details": offer["terms"], "source_url": offer["url"],
            "captured_at": offer["capturedAt"],
            "locations": json.dumps(offer["locations"], ensure_ascii=False),
        })
print(f"Prepared {len(offers)} offers in {target}")
