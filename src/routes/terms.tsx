import { createFileRoute, Link } from "@tanstack/react-router";
import { InformationPage } from "@/components/InformationPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — Student Steals" }] }),
  component: TermsPage,
});

export function TermsPage() {
  return (
    <InformationPage
      title="Terms"
      intro="Practical conditions for using this independent student project and the offers it lists."
    >
      <section>
        <h2>About the service</h2>
        <p>
          Student Steals helps students discover discounts, cardholder offers, and food events. It is an
          IS 401 class project, not an official university service, merchant, ticket seller, or
          Starving Student Card provider.
        </p>
      </section>
      <section>
        <h2>Offer and event requirements</h2>
        <p>
          The merchant, card provider, or event organizer sets eligibility, availability, dates,
          attendance requirements, and redemption rules. An offer may require a valid student ID, an
          active card, a purchase, or another condition. Confirm the original source before
          traveling or purchasing. Listings may be incomplete, outdated, canceled, or incorrect.
        </p>
      </section>
      <section>
        <h2>Saves, tracking, and directions</h2>
        <p>
          Saving an item does not reserve food, admission, inventory, or an offer. Marking a card
          offer used is a personal record; it does not redeem the offer, verify eligibility, or
          change a merchant’s records. Saves and card-use tracking currently stay in your browser
          and can be lost if site storage is cleared.
        </p>
        <p>
          Map pins identify locations and may be approximate; they do not identify exact rooms or
          accessible entrances. Check building and room details with the organizer and follow local
          access rules. External map applications provide their own routes.
        </p>
      </section>
      <section>
        <h2>Accounts and contributions</h2>
        <p>
          Keep your sign-in credentials private. Provide accurate information when creating a
          profile, sharing an event, or reporting a listing. Do not submit private information about
          someone else, misleading offers, spam, or material you do not have permission to share. A
          submitted report is not a guarantee of a correction or a response time.
        </p>
      </section>
      <section>
        <h2>External services and information</h2>
        <p>
          Linked offer sources, card portals, map services, and other external websites operate
          independently. Their own conditions apply when you use them. Read{" "}
          <Link to="/privacy">Privacy</Link> to understand the current application’s storage,
          account, activity, and map behavior.
        </p>
      </section>
      <section>
        <h2>Problems and corrections</h2>
        <p>
          Use the report option in listing details for incorrect information. See{" "}
          <Link to="/contact">Contact</Link> for website bug-reporting options. The project may
          change as the student team develops it; confirm current information before relying on a
          listing.
        </p>
      </section>
    </InformationPage>
  );
}
