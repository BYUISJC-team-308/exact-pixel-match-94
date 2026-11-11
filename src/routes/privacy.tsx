import { createFileRoute, Link } from "@tanstack/react-router";
import { InformationPage } from "@/components/InformationPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy — Studeats" }] }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  return (
    <InformationPage
      title="Privacy"
      intro="How the current Studeats application handles account information, browser storage, activity, and maps."
    >
      <section>
        <h2>Accounts and profiles</h2>
        <p>
          Supabase handles account registration, password sign-in, and session restoration.
          Registration sends your email and password to Supabase Auth. Profile information includes
          your username, name, school, and any phone number or profile image you supply. Signed-in
          profile edits are stored in the project’s Supabase database.
        </p>
        <p>
          The Supabase client keeps session information in your browser so it can restore your
          sign-in. Sign out when using a shared device.
        </p>
      </section>
      <section>
        <h2>Saved items and browser storage</h2>
        <p>
          Saved discount and event identifiers, card-use counts, your preferred campus, and up to
          eight recent map searches currently stay in this browser’s local storage. They do not yet
          sync between devices or accounts. Signing out does not clear these saved selections.
        </p>
        <p>
          You can remove saved items using their save controls and clear recent map searches in the
          map interface. Clearing this site’s browser storage removes browser-local selections,
          activity backups, and sign-in storage; it does not delete your Supabase account, profile,
          or records already sent to the database.
        </p>
      </section>
      <section>
        <h2>Activity and project measurements</h2>
        <p>
          The application records actions such as starting a session, signing up or in, saving an
          item, and marking a card offer used. Activity includes a browser-generated device
          identifier, action type, timestamp, related item information, and your account identifier
          when available. Signup activity can include the username and email entered during
          registration.
        </p>
        <p>
          The application keeps a local backup of up to 100 activity records and attempts to send
          activity to Supabase. The team’s restricted OKR dashboard uses aggregate database
          measurements. A failed analytics request does not mean that no local activity was stored.
        </p>
      </section>
      <section>
        <h2>Maps and location</h2>
        <p>
          Using “Find my location” asks your browser for location permission. The map uses the
          returned coordinates to show your position. The current map code does not save those
          coordinates as a profile field or map-search-history entry. Map and tile providers still
          receive network requests needed to display the map, including the area being viewed.
        </p>
        <p>
          Map backgrounds use MapTiler when configured, or OpenFreeMap, with OpenStreetMap data
          attribution. Choosing directions opens Google Maps or Apple Maps with the selected
          destination; those services handle their own directions and location settings. You can
          deny or revoke location access in your browser.
        </p>
      </section>
      <section>
        <h2>Reports and external services</h2>
        <p>
          Listing reports send the listing identifier and label, issue category, optional details,
          and current page URL to Supabase. Avoid including private information in report text.
          Website bugs posted to the project’s GitHub issue tracker are public.
        </p>
        <p>
          The website is deployed through Vercel. Fonts are requested from Google Fonts, and some
          business icons may be requested from Google or DuckDuckGo. Offer-source links and
          directions take you to external services. Providers receive network information when your
          browser contacts them and apply their own policies. In editor previews, available Lovable
          error-reporting hooks may receive error details and the page path.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can browse listings without creating an account, decline location permission, sign
          out, remove local saved items, and clear site storage through your browser. These actions
          have different effects on local and account data as described above. See{" "}
          <Link to="/contact">Contact</Link> to email the student team about account or privacy
          questions, report a listing, or submit a public website bug report. Do not put account
          information in a public issue. Clearing site storage does not make a deletion request for
          records held by the project or its providers.
        </p>
      </section>
    </InformationPage>
  );
}
