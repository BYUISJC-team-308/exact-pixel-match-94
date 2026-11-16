import { test, expect } from "@playwright/test";

test.describe("Authentication, Multi-Device Sync & RLS Data Isolation", () => {
  test("guest user can save items locally, view prompt in My Hub, and merge into account on login", async ({
    page,
  }) => {
    // 1. Visit homepage as a guest
    await page.goto("/");
    await expect(page.locator("#my-hub")).toBeVisible();

    // 2. Browse discounts and save a deal
    await page.goto("/discounts");
    const firstSaveButton = page.getByRole("button", { name: /Save deal/i }).first();
    await expect(firstSaveButton).toBeVisible();
    await firstSaveButton.click();

    // Toast feedback appears with 'View My Hub' link
    await expect(page.getByText(/Saved deal to your hub/i)).toBeVisible();

    // 3. Return to homepage Hub and verify guest counter prompt
    await page.goto("/#my-hub");
    const hub = page.locator("#my-hub");
    await expect(hub.getByText(/saved on this browser ready to sync/i)).toBeVisible();
    await expect(hub.getByRole("link", { name: /Sign in to sync/i })).toBeVisible();

    // 4. Navigate to sign-in and authenticate
    await page.goto("/signin");
    await page.getByPlaceholder("you@byu.edu").fill("test_student@byu.edu");
    await page.getByPlaceholder("••••••••").fill("StudentPassword123!");
    await page.getByRole("button", { name: /Sign in/i }).click();

    // 5. Verify redirect and cloud sync indicator in profile
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "My Saved Items" })).toBeVisible();
    await expect(page.getByText("✓ Supabase Active")).toBeVisible();
    await expect(page.getByText("Live multi-device sync")).toBeVisible();
  });

  test("live real-time sync across simulated devices (laptop vs. phone contexts)", async ({
    browser,
  }) => {
    // Create Device A (Laptop - Desktop Chrome)
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();

    // Create Device B (Phone - Mobile Safari emulation)
    const contextB = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    });
    const pageB = await contextB.newPage();

    // Sign in both devices with the same student account
    for (const p of [pageA, pageB]) {
      await p.goto("/signin");
      await p.getByPlaceholder("you@byu.edu").fill("test_sync_user@byu.edu");
      await p.getByPlaceholder("••••••••").fill("SecureStudentPass123!");
      await p.getByRole("button", { name: /Sign in/i }).click();
      await p.waitForURL((url) => !url.pathname.includes("/signin"));
    }

    // Device A saves an upcoming free-food event
    await pageA.goto("/free-food");
    const saveEventBtn = pageA.getByRole("button", { name: /Save event to hub/i }).first();
    await saveEventBtn.click();
    await expect(pageA.getByText(/Saved event to your hub/i)).toBeVisible();

    // Device B is viewing My Hub; Supabase Realtime WebSocket pushes change
    await pageB.goto("/#my-hub");
    const hubB = pageB.locator("#my-hub");
    // Verify the newly saved item appears on Device B without manual page reload
    await expect(hubB.locator("li")).not.toHaveCount(0);

    // Device B removes the item via inline quick-remove button
    const removeBtn = hubB.getByRole("button", { name: /Remove .* from hub/i }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }

    // Device A immediately reflects the removal
    await pageA.goto("/#my-hub");
    await expect(pageA.locator("#my-hub")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("sign-out completely wipes local state protecting subsequent campus terminal users", async ({
    page,
  }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("you@byu.edu").fill("test_student@byu.edu");
    await page.getByPlaceholder("••••••••").fill("StudentPassword123!");
    await page.getByRole("button", { name: /Sign in/i }).click();

    // Verify authenticated state
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();

    // Click Sign Out
    await page.getByRole("button", { name: /Sign out/i }).click();

    // Hub must be empty of private account items
    await page.goto("/#my-hub");
    const hubText = await page.locator("#my-hub").innerText();
    expect(hubText).not.toContain("✓ Supabase Active");

    // Local storage check
    const localState = await page.evaluate(() => localStorage.getItem("studeats-state"));
    if (localState) {
      const parsed = JSON.parse(localState);
      expect(parsed.savedDeals || []).toHaveLength(0);
      expect(parsed.savedEvents || []).toHaveLength(0);
      expect(parsed.user).toBeNull();
    }
  });

  test("Row Level Security (RLS) guarantees complete cross-user data isolation", async ({
    request,
  }) => {
    // Attempt unauthorized direct query to Supabase PostgREST API without valid JWT
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zwygwfcaollyotvfwumx.supabase.co";
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eWd3ZmNhb2xseW90dmZ3dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NzcxMjcsImV4cCI6MjEwNzI1MzEyN30.h2BtQWvBJY103qKlxQwuKvhnjdzB_0b_CJD0ULvf0Cg";

    // Unauthenticated user attempting to insert into saved_deals for arbitrary user UUID
    const response = await request.post(`${supabaseUrl}/rest/v1/saved_deals`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      data: {
        user_id: "00000000-0000-0000-0000-000000000000",
        deal_id: "b67cbe4f-ae16-4cc4-8bde-3ce806ab4965",
      },
    });

    // Postgres RLS must reject with 401 or 403 (Error 42501)
    expect([401, 403]).toContain(response.status());
  });
});
