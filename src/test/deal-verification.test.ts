import { describe, it, expect } from "vitest";
import { calculateVerificationScore } from "@/lib/deal-verification";
import { normalizeDeal, type DbDeal } from "@/lib/deals";
import type { Deal } from "@/lib/data";

describe("Deal Verification Score Calculation", () => {
  it("handles empty vote states correctly", () => {
    const score = calculateVerificationScore(0, 0);
    expect(score.hasVotes).toBe(false);
    expect(score.percentage).toBe(0);
    expect(score.total).toBe(0);
    expect(score.label).toBe("No votes yet");
    expect(score.badgeColor).toContain("muted");
  });

  it("calculates 100% Real when all votes are real", () => {
    const score = calculateVerificationScore(15, 0);
    expect(score.hasVotes).toBe(true);
    expect(score.percentage).toBe(100);
    expect(score.total).toBe(15);
    expect(score.label).toBe("100% Real");
    expect(score.badgeColor).toContain("emerald");
  });

  it("calculates 80% Real for 8 real and 2 fake votes", () => {
    const score = calculateVerificationScore(8, 2);
    expect(score.hasVotes).toBe(true);
    expect(score.percentage).toBe(80);
    expect(score.total).toBe(10);
    expect(score.label).toBe("80% Real");
    expect(score.badgeColor).toContain("emerald");
  });

  it("flags mixed reviews between 50% and 75%", () => {
    const score = calculateVerificationScore(6, 4);
    expect(score.percentage).toBe(60);
    expect(score.label).toContain("Mixed");
    expect(score.badgeColor).toContain("amber");
  });

  it("flags disputed or expired deals under 50%", () => {
    const score = calculateVerificationScore(2, 8);
    expect(score.percentage).toBe(20);
    expect(score.label).toContain("Disputed");
    expect(score.badgeColor).toContain("destructive");
  });
});

describe("Deal Normalization with Community Fields", () => {
  it("normalizes a verified deal with default counts", () => {
    const row: DbDeal = {
      id: "deal-1",
      title: "10% Student Discount",
      company: "Apple",
      category: "Tech",
      value: "10% off",
      verification_status: "verified",
      upvotes_count: 5,
      real_votes_count: 8,
      fake_votes_count: 1,
    };

    const normalized = normalizeDeal(row);
    expect(normalized.verificationStatus).toBe("verified");
    expect(normalized.upvotesCount).toBe(5);
    expect(normalized.realVotesCount).toBe(8);
    expect(normalized.fakeVotesCount).toBe(1);
    expect(normalized.submitterUsername).toBeUndefined();
  });

  it("normalizes a community deal with submitter attribution", () => {
    const row: DbDeal = {
      id: "deal-2",
      title: "Free Chips with Burrito",
      company: "Chipotle",
      category: "Food",
      value: "Free Chips",
      verification_status: "community",
      user_id: "00000000-0000-4000-8000-000000000001",
      upvotes_count: 24,
      real_votes_count: 18,
      fake_votes_count: 2,
      created_at: "2026-11-11T12:00:00Z",
      profiles: {
        username: "cosmobro",
        full_name: "Cosmo Cougar",
      },
    };

    const normalized = normalizeDeal(row);
    expect(normalized.verificationStatus).toBe("community");
    expect(normalized.userId).toBe("00000000-0000-4000-8000-000000000001");
    expect(normalized.submitterUsername).toBe("cosmobro");
    expect(normalized.submitterName).toBe("Cosmo Cougar");
    expect(normalized.upvotesCount).toBe(24);
  });
});

describe("Community Deals Sorting", () => {
  const sampleDeals: Deal[] = [
    {
      id: "1",
      title: "Deal A",
      company: "Comp A",
      category: "Food",
      type: "Percent off",
      value: "10% off",
      description: "",
      howTo: "",
      duration: "",
      url: "",
      verificationStatus: "community",
      upvotesCount: 10,
      realVotesCount: 5,
      fakeVotesCount: 5, // 50%
      createdAt: "2026-11-01T10:00:00Z",
    },
    {
      id: "2",
      title: "Deal B",
      company: "Comp B",
      category: "Food",
      type: "Percent off",
      value: "20% off",
      description: "",
      howTo: "",
      duration: "",
      url: "",
      verificationStatus: "community",
      upvotesCount: 30,
      realVotesCount: 9,
      fakeVotesCount: 1, // 90%
      createdAt: "2026-11-05T10:00:00Z",
    },
    {
      id: "3",
      title: "Deal C",
      company: "Comp C",
      category: "Food",
      type: "Percent off",
      value: "30% off",
      description: "",
      howTo: "",
      duration: "",
      url: "",
      verificationStatus: "community",
      upvotesCount: 5,
      realVotesCount: 10,
      fakeVotesCount: 0, // 100%
      createdAt: "2026-11-10T10:00:00Z",
    },
  ];

  it("sorts by Most Upvoted correctly", () => {
    const sorted = [...sampleDeals].sort((a, b) => (b.upvotesCount ?? 0) - (a.upvotesCount ?? 0));
    expect(sorted.map((d) => d.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by Newest correctly", () => {
    const sorted = [...sampleDeals].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    expect(sorted.map((d) => d.id)).toEqual(["3", "2", "1"]);
  });

  it("sorts by Highest Verification Rating correctly", () => {
    const sorted = [...sampleDeals].sort((a, b) => {
      const scoreA = calculateVerificationScore(a.realVotesCount, a.fakeVotesCount);
      const scoreB = calculateVerificationScore(b.realVotesCount, b.fakeVotesCount);
      return scoreB.percentage - scoreA.percentage;
    });
    expect(sorted.map((d) => d.id)).toEqual(["3", "2", "1"]);
  });
});
