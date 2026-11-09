import { describe, it, expect } from "vitest";
import { deduplicateDeals, isCanadianOnlyDeal, getDealScore } from "@/lib/deals";

describe("deals deduplication", () => {
  it("deduplicates deals with the same ID.me offer ID", () => {
    const deals = [
      {
        id: "1",
        company: "GlassesUSA.com",
        title: "$20 off orders $150+",
        value: "$20 off",
        url: "https://shop.id.me/offer/3772008/clicks/track?source=web",
      },
      {
        id: "2",
        company: "GlassesUSA.com",
        title: "$20 off orders $150+ for US and Canadian Students",
        value: "$20 off",
        url: "https://shop.id.me/offer/3772008/clicks/track?source=other",
      },
    ];

    const result = deduplicateDeals(deals);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("deduplicates deals with same company and same offer value", () => {
    const deals = [
      {
        id: "1",
        company: "Oura",
        title: "Save 10% on Oura Ring",
        value: "10% off",
        url: "https://example.com/1",
      },
      {
        id: "2",
        company: "Oura",
        title: "10% Off",
        value: "10% Off",
        url: "https://example.com/2",
      },
    ];

    const result = deduplicateDeals(deals);
    expect(result).toHaveLength(1);
  });

  it("preserves distinct deals from the same company", () => {
    const deals = [
      {
        id: "1",
        company: "Microsoft",
        title: "Microsoft 365 Education Free Edition",
        value: "100% Free",
        url: "https://www.microsoft.com/education",
      },
      {
        id: "2",
        company: "Microsoft",
        title: "Azure for Students + $100 Credits",
        value: "$100 Free Credit",
        url: "https://azure.microsoft.com/free",
      },
    ];

    const result = deduplicateDeals(deals);
    expect(result).toHaveLength(2);
  });

  it("correctly identifies Canadian-only deals", () => {
    expect(isCanadianOnlyDeal({ title: "10% off for Canadian Students", description: "Only in Canada" })).toBe(true);
    expect(isCanadianOnlyDeal({ title: "10% off for U.S. and Canadian Students", description: "" })).toBe(false);
    expect(isCanadianOnlyDeal({ title: "10% off", description: "Available across Utah and US" })).toBe(false);
  });

  it("scores free software and tools higher than standard percent off", () => {
    const freeDeal = { title: "Figma Professional Plan", value: "Free Professional Tier", type: "Free" };
    const pctDeal = { title: "Shoe Discount", value: "20% off", type: "Percent off" };
    const cbDeal = { title: "Travel Cash Back", value: "2.0% cash back", type: "Percent off" };

    expect(getDealScore(freeDeal)).toBeGreaterThan(getDealScore(pctDeal));
    expect(getDealScore(pctDeal)).toBeGreaterThan(getDealScore(cbDeal));
  });

  it("ranks higher dollar free software above lower dollar software", () => {
    const tableau = { title: "Tableau for Students", value: "100% Free ($840/yr value)", type: "Free" };
    const domain = { title: "Namecheap Free Domain", value: "Free Domain ($25 value)", type: "Free" };

    expect(getDealScore(tableau)).toBeGreaterThan(getDealScore(domain));
  });
});
