"""Convert the local, ignored catalog snapshot to a Supabase Table Editor CSV.

Run: python3 scripts/prepare-starving-student-import.py PATH_TO_SNAPSHOT.json OUTPUT.csv
Do not commit the input or generated CSV; both contain portal catalog data.
"""
import csv
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("Usage: prepare-starving-student-import.py INPUT.json OUTPUT.csv")
source = Path(sys.argv[1])
target = Path(sys.argv[2])
if target.resolve().is_relative_to(Path.cwd().resolve()):
    raise SystemExit("Write the CSV outside the repository, such as /tmp/starving-student-import.csv")
offers = json.loads(source.read_text())
if len({offer["id"] for offer in offers}) != len(offers):
    raise SystemExit("Duplicate offer IDs in source")
fields = ["id", "category", "company", "offer_text", "terms", "source_url", "captured_at", "locations"]
with target.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    for offer in offers:
        writer.writerow({
            "id": offer["id"],
            "category": offer["category"],
            "company": offer["company"],
            "offer_text": offer["offer"],
            "terms": offer["terms"],
            "source_url": offer["url"],
            "captured_at": offer["capturedAt"],
            "locations": json.dumps(offer["locations"], ensure_ascii=False),
        })
print(f"Prepared {len(offers)} offers in {target}")
