import { describe, it, expect } from "vitest";
import {
  standardizeEventDescription,
  extractRequirements,
  normalizeFoodEvent,
  type DbFoodEvent,
} from "@/lib/food-events";

describe("Food Event Description Standardization (P13)", () => {
  const userQuotedDisjointedDetails = [
    "Student project showcase 2–3:45 PM; mini-hackathon/build time 4–5:30 PM; professional panel and judging 5:30–6:30 PM; awards 6:30–6:45 PM. Listing ends at 7 PM. Beginners welcome.",
    "Eligibility: Advertised to CS, IS and Math students; beginners welcome. Additional attendance restrictions are not stated.",
    "Registration: Handshake shows a Register button. Whether registration is required, capacity and deadlines are not stated.",
    "Cost: No price is stated; the organizer says pizza is provided. Check the source before attending.",
    "Food serving time, quantities and dietary options are not stated.",
    "Source: https://byu.joinhandshake.com/stu/events/2056333",
    'Checked 2026-11-12. Times are America/Denver. Organizer statement: "Pizza will be provided!".',
  ].join("\n\n");

  it("transforms disjointed Handshake text into clean, readable standardized copy", () => {
    const cleaned = standardizeEventDescription(userQuotedDisjointedDetails);

    // 1. Natural summary preserved
    expect(cleaned).toContain("Student project showcase 2–3:45 PM; mini-hackathon/build time 4–5:30 PM");

    // 2. Requirements cleanly extracted without attendance boilerplate
    expect(cleaned).toContain("Requirements: Advertised to CS, IS and Math students; beginners welcome.");
    expect(cleaned).not.toContain("Additional attendance restrictions are not stated");

    // 3. Clean registration CTA
    expect(cleaned).toContain("Registration: Go to Handshake to register.");
    expect(cleaned).not.toContain("Whether registration is required, capacity and deadlines are not stated");

    // 4. Cost boilerplate dropped
    expect(cleaned).not.toContain("Cost: No price is stated");
    expect(cleaned).not.toContain("the organizer says pizza is provided");

    // 5. Audit disclaimer boilerplate dropped
    expect(cleaned).not.toContain("Food serving time, quantities and dietary options");
    expect(cleaned).not.toContain("Times are America/Denver");
    expect(cleaned).not.toContain("Organizer statement:");
  });

  it("extracts specific major requirements like 'Only accounting majors'", () => {
    const details = [
      "Join us for an evening of networking with top accounting firms and enjoy dinner.",
      "Eligibility: Only accounting majors. Additional attendance restrictions are not stated.",
      "Registration: Handshake shows a Register button.",
      "Cost: No price is stated.",
    ].join("\n\n");

    const req = extractRequirements(details);
    expect(req).toBe("Only accounting majors.");

    const cleaned = standardizeEventDescription(details);
    expect(cleaned).toContain("Requirements: Only accounting majors.");
    expect(cleaned).toContain("Registration: Go to Handshake to register.");
    expect(cleaned).not.toContain("Cost:");
  });

  it("leaves already-natural campus event descriptions intact", () => {
    const naturalText =
      "Join ACM for our semester kickoff! Meet student engineers, learn about upcoming coding competitions, and enjoy free pizza and drinks.";
    expect(standardizeEventDescription(naturalText)).toBe(naturalText);
  });

  it("normalizes a DbFoodEvent and attaches requirements to the event object", () => {
    const row: DbFoodEvent = {
      id: "test-event-1",
      title: "AI Day - CS, IS, Math",
      host: "BYU AI Association",
      food: "Pizza provided",
      event_date: "2026-11-16",
      start_time: "14:00:00",
      end_time: "19:00:00",
      building: "Wilkinson Student Center",
      room: "Garden Court",
      details: userQuotedDisjointedDetails,
    };

    const normalized = normalizeFoodEvent(row);
    expect(normalized.requirements).toBe(
      "Advertised to CS, IS and Math students; beginners welcome.",
    );
    expect(normalized.details).toContain("Registration: Go to Handshake to register.");
    expect(normalized.details).not.toContain("Additional attendance restrictions are not stated");
  });
});
