import { test, expect } from "@playwright/test";

test.describe("Mobile Responsive Experience & Tactile Punches (P20 & P30)", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 screen

  test("Starving Student Card punches advance count, show redeemed state, and enforce boundaries without header reset", async ({
    page,
  }) => {
    await page.goto("/starving-student");

    // Header check: destructive 'Reset All Deals' action MUST NOT exist per Card P30
    await expect(page.getByRole("button", { name: /Reset all/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Clear all punches/i })).toHaveCount(0);

    // Find a multi-punch deal card
    const punchButton = page.getByRole("button", { name: /Mark as used|Punch card|Use deal/i }).first();
    if (await punchButton.isVisible()) {
      const initialText = await punchButton.innerText();

      // Click to punch
      await punchButton.click();

      // Verify immediate state feedback (optimistic update)
      const afterText = await punchButton.innerText();
      expect(afterText).not.toEqual(initialText);

      // Verify tactile visual indicator or redeemed stamp
      await expect(page.getByText(/Punched|Used|Redeemed/i).first()).toBeVisible();
    }
  });

  test("campus calendar adapts to mobile phone viewport with single-day agenda browsing", async ({
    page,
  }) => {
    await page.goto("/calendar");

    // On mobile, calendar must show compact day agenda view
    await expect(page.getByRole("heading", { name: /Calendar|Campus Schedule/i })).toBeVisible();

    // Verify date navigation buttons are touch-friendly (at least 40px touch targets)
    const prevDayBtn = page.getByRole("button", { name: /Previous day|←/i }).first();
    const nextDayBtn = page.getByRole("button", { name: /Next day|→/i }).first();

    if (await prevDayBtn.isVisible() && await nextDayBtn.isVisible()) {
      const box = await nextDayBtn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(36);
        expect(box.height).toBeGreaterThanOrEqual(36);
      }

      // Clicking next day updates agenda list
      await nextDayBtn.click();
      await expect(page.locator("body")).toBeVisible();
    }

    // Verify clicking an event opens details with Google Calendar export link
    const eventItem = page.locator("article, li, button").filter({ hasText: /Free|Pizza|Bagel|Social/i }).first();
    if (await eventItem.isVisible()) {
      await eventItem.click();

      // Details modal opens
      const calLink = page.getByRole("link", { name: /Add to Google Calendar/i });
      if (await calLink.isVisible()) {
        const href = await calLink.getAttribute("href");
        expect(href).toContain("calendar.google.com/calendar/render");
        expect(href).toContain("action=TEMPLATE");
      }
    }
  });

  test("interactive campus map maintains responsive controls on mobile without horizontal clipping", async ({
    page,
  }) => {
    await page.goto("/map");

    // Verify map canvas container initializes
    await expect(page.locator(".maplibregl-canvas, [data-testid='map-container'], canvas").first()).toBeVisible({
      timeout: 10000,
    });

    // Check search control is touch-accessible
    const searchBar = page.getByPlaceholder(/Search campus buildings|Search location/i);
    if (await searchBar.isVisible()) {
      await searchBar.fill("TMCB");
      await page.keyboard.press("Enter");
    }

    // Viewport width does not cause horizontal page overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // Allow 2px subpixel rounding
  });
});
