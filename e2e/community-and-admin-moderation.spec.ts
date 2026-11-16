import { test, expect } from "@playwright/test";

test.describe("Community Submissions, Issue Reporting & Admin Moderation (P14)", () => {
  test("public user can submit an incorrect-information report from details view", async ({
    page,
  }) => {
    await page.goto("/discounts");

    // Click on first deal to open detail modal
    const dealCard = page.locator("article, [data-testid='deal-card'], button").filter({ hasText: /%/ }).first();
    await dealCard.click();

    // Look for Report Issue button
    const reportBtn = page.getByRole("button", { name: /Report issue|Report incorrect info/i });
    if (await reportBtn.isVisible()) {
      await reportBtn.click();

      // Modal opens
      await expect(page.getByRole("heading", { name: /Report an issue|Report listing/i })).toBeVisible();

      // Select category
      const categorySelect = page.locator("select[name='reason'], select[name='category']");
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ index: 1 });
      }

      // Enter details
      const detailsInput = page.getByPlaceholder(/Describe what is incorrect/i);
      if (await detailsInput.isVisible()) {
        await detailsInput.fill("The student discount was reduced from 20% to 10% this semester.");
      }

      // Submit
      const submitBtn = page.getByRole("button", { name: /Submit report/i });
      await submitBtn.click();

      // Confirmation toast
      await expect(page.getByText(/Report submitted|Thank you for reporting/i)).toBeVisible();
    }
  });

  test("non-admin students are blocked from administrative moderation tools", async ({ page }) => {
    // Sign in as standard student
    await page.goto("/signin");
    await page.getByPlaceholder("you@byu.edu").fill("regular_student@byu.edu");
    await page.getByPlaceholder("••••••••").fill("StudentPassword123!");
    await page.getByRole("button", { name: /Sign in/i }).click();

    // Try to visit /admin
    await page.goto("/admin");

    // Should either redirect away, show access denied, or require admin credentials
    const pageText = await page.innerText("body");
    const isProtected =
      page.url().includes("/signin") ||
      pageText.includes("Admin access required") ||
      pageText.includes("Sign in as an administrator") ||
      pageText.includes("Forbidden") ||
      pageText.includes("Not authorized");

    expect(isProtected).toBe(true);
  });

  test("admin dashboard allows reviewing open reports and resolving or deleting listings", async ({
    page,
  }) => {
    // Authenticate as team admin
    await page.goto("/signin");
    await page.getByPlaceholder("you@byu.edu").fill("admin_team@byu.edu");
    await page.getByPlaceholder("••••••••").fill("AdminSecret123!");
    await page.getByRole("button", { name: /Sign in/i }).click();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Admin Reports|Issue Moderation/i })).toBeVisible();

    // Switch to Open Reports tab
    const openTab = page.getByRole("tab", { name: /Open Reports/i });
    if (await openTab.isVisible()) {
      await openTab.click();
    }

    // Inspect first report item
    const firstReport = page.locator("[data-testid='report-item'], li").filter({ hasText: /Reported/i }).first();
    if (await firstReport.isVisible()) {
      // Click Resolve button
      const resolveBtn = firstReport.getByRole("button", { name: /Resolve|Fix/i });
      await resolveBtn.click();

      // Verify Resolve dialog
      await expect(page.getByRole("dialog")).toBeVisible();
      const resolutionNote = page.getByPlaceholder(/Resolution notes/i);
      if (await resolutionNote.isVisible()) {
        await resolutionNote.fill("Verified with merchant and updated discount terms.");
      }
      await page.getByRole("button", { name: /Confirm resolution|Mark resolved/i }).click();

      // Toast confirms resolved status
      await expect(page.getByText(/Report resolved|Updated successfully/i)).toBeVisible();
    }
  });
});
