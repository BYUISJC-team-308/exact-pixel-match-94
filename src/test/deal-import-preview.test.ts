import { expect, test } from "vitest";
import { planDealImport } from "../../scripts/preview-deal-import.mjs";

const asOf = "2026-11-16";
const offer = {
  company: "Example",
  title: "Student offer",
  category: "Tech",
  deal_type: "Percent off",
  value: "15% off",
  description: "Student pricing on eligible products.",
  eligibility: "Current college students.",
  how_to_redeem: "Verify through the merchant.",
  url: "https://example.com/education",
};
const existing = { ...offer, id: "existing-deal", value: "10% off" };
const batch = (...offers: unknown[]) => ({ checked_on: asOf, offers });

test("detects an update through a normalized URL and preserves the existing ID", () => {
  const plan = planDealImport(
    batch({ ...offer, title: "Education discount" }),
    [{ ...existing, url: "https://www.example.com/education/?utm_source=directory" }],
    asOf,
  );
  expect(plan.entries[0]).toMatchObject({ status: "update", existingId: existing.id });
  expect(plan.entries[0].changes).toContainEqual({
    field: "value",
    before: "10% off",
    after: "15% off",
  });
});

test("flags ambiguous matches, expired offers, and repeated candidates", () => {
  const plan = planDealImport(
    batch(
      { ...offer, title: "New bundle", url: "https://example.com/bundle" },
      { ...offer, company: "Expired", expires_on: "2026-11-15" },
      { ...offer, company: "Duplicate" },
      { ...offer, company: "Duplicate", url: "https://example.com/education?utm_medium=email" },
      { ...offer, company: "New Merchant" },
      { ...offer, company: "Invalid", url: "http://example.com/education" },
    ),
    [existing],
    asOf,
  );
  expect(plan.entries.map((entry) => entry.status)).toEqual([
    "review",
    "review",
    "review",
    "review",
    "add",
    "review",
  ]);
});

test("surfaces competing updates to a single existing listing", () => {
  const plan = planDealImport(
    batch({ ...offer, url: "https://example.com/new-url" }, { ...offer, title: "New offer title" }),
    [existing],
    asOf,
  );
  expect(plan.counts).toEqual({ add: 0, update: 0, unchanged: 0, review: 2 });
  expect(plan.entries[0].reason).toBe("Multiple candidates match the same listing");
});
