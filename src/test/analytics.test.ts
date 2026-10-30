import { describe, it, expect } from "vitest";
import { computeOkrMetrics, type ActivityEvent } from "@/lib/analytics";

describe("Analytics & OKR Metrics Calculation (Feature 11)", () => {
  it("calculates average minutes from signup to first deal saved (OKR 1.1)", () => {
    const baseTime = new Date("2026-10-30T10:00:00Z").getTime();

    const sampleEvents: ActivityEvent[] = [
      // User 1: signed up at 10:00, saved deal at 10:04 (4 minutes)
      {
        device_id: "user-1",
        event_type: "signup",
        created_at: new Date(baseTime).toISOString(),
      },
      {
        device_id: "user-1",
        event_type: "deal_saved",
        created_at: new Date(baseTime + 4 * 60 * 1000).toISOString(),
      },
      // User 2: signed up at 10:00, saved deal at 10:08 (8 minutes)
      {
        device_id: "user-2",
        event_type: "signup",
        created_at: new Date(baseTime).toISOString(),
      },
      {
        device_id: "user-2",
        event_type: "deal_saved",
        created_at: new Date(baseTime + 8 * 60 * 1000).toISOString(),
      },
    ];

    const metrics = computeOkrMetrics(sampleEvents);
    // (4 + 8) / 2 = 6.0 minutes
    expect(metrics.avgMinutesToFirstSave).toBe(6);
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.userSaveConversionRate).toBe(100);
  });

  it("calculates redemption and return visit rates accurately (OKR 2.1 & OKR 2.2)", () => {
    const sampleEvents: ActivityEvent[] = [
      { device_id: "user-A", event_type: "signup", created_at: "2026-10-20T10:00:00Z" },
      { device_id: "user-A", event_type: "deal_saved", created_at: "2026-10-20T10:02:00Z" },
      { device_id: "user-A", event_type: "deal_redeemed", created_at: "2026-10-21T12:00:00Z" },
      { device_id: "user-A", event_type: "return_visit", created_at: "2026-10-24T15:00:00Z" },

      { device_id: "user-B", event_type: "signup", created_at: "2026-10-20T11:00:00Z" },
      // user-B did not save or redeem
    ];

    const metrics = computeOkrMetrics(sampleEvents);
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.userSaveConversionRate).toBe(50); // 1 out of 2 = 50%
    expect(metrics.redemptionRate).toBe(50);          // 1 out of 2 = 50%
    expect(metrics.sevenDayReturnRate).toBe(50);      // 1 out of 2 = 50%
  });
});
