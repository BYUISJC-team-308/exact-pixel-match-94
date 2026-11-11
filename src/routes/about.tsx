import { createFileRoute, Link } from "@tanstack/react-router";
import { InformationPage } from "@/components/InformationPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Studeats" },
      {
        name: "description",
        content: "Meet the student project behind Studeats and learn how to use its listings.",
      },
    ],
  }),
  component: AboutPage,
});

export function AboutPage() {
  return (
    <InformationPage
      title="About Studeats"
      intro="A Group 8 IS 401 student project that brings student discounts, Starving Student Card offers, and free-food events into one place."
    >
      <section>
        <h2>Three ways to save</h2>
        <p>
          Browse student discounts, explore cardholder offers, or find campus events with food. Use
          the calendar to plan a day and the map to find the location.{" "}
          <Link to="/help">How it works</Link> explains eligibility, saving, and card-use tracking.
        </p>
      </section>
      <section>
        <h2>An independent student project</h2>
        <p>
          Studeats is a student-built project. It is not an official university service or the
          official Starving Student Card portal. Listing an organization, event, or offer does not
          mean that its provider sponsors or endorses this project.
        </p>
      </section>
      <section>
        <h2>Check the original details</h2>
        <p>
          Offers and events can change. Review the listing’s source and confirm dates, availability,
          eligibility, and redemption rules with the merchant or organizer before making plans. Our
          personal card-use tracker does not redeem an offer with a merchant.
        </p>
      </section>
      <section>
        <h2>Help us improve</h2>
        <p>
          Found an incorrect offer or event? Open its details and use the report option. For other
          website issues, visit <Link to="/contact">Contact</Link>.
        </p>
      </section>
    </InformationPage>
  );
}
