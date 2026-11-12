import { createFileRoute, Link } from "@tanstack/react-router";
import { InformationPage } from "@/components/InformationPage";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Student Steals" }] }),
  component: ContactPage,
});

export function ContactPage() {
  return (
    <InformationPage
      title="Contact"
      intro="Reach the student team, report a listing problem, or share a website bug."
    >
      <section>
        <h2>Contact the student team</h2>
        <p>
          Email Lot Holmstead for general questions, account concerns, or privacy requests. Include
          the page and a brief description so we can understand the issue. Never send your password
          or sign-in link.
        </p>
        <a className="mt-3 inline-flex min-h-11 items-center" href="mailto:lotstarr@gmail.com">
          lotstarr@gmail.com
        </a>
        <p>
          For private account matters, use email rather than the public issue tracker below. Do not
          include more personal information than needed to explain your request.
        </p>
      </section>
      <section>
        <h2>Incorrect offer or event</h2>
        <p>
          Open the affected discount, card offer, or event and choose its report option. Include
          what is wrong and the correct source if you have one. Reports send the listing identifier,
          issue type, your description, and the page URL to the project’s database.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          <Link className="inline-flex min-h-11 items-center" to="/discounts">
            Discounts
          </Link>
          <Link className="inline-flex min-h-11 items-center" to="/starving-student">
            Card offers
          </Link>
          <Link className="inline-flex min-h-11 items-center" to="/free-food">
            Free-food events
          </Link>
        </div>
      </section>
      <section>
        <h2>Website bug reports</h2>
        <p>
          The project has a public GitHub issue tracker. Describe the page, steps to reproduce the
          problem, your browser, and what you expected to happen. You may need a GitHub account to
          create an issue.
        </p>
        <a
          className="mt-3 inline-flex min-h-11 items-center"
          href="https://github.com/BYUISJC-team-308/exact-pixel-match-94/issues"
        >
          Open the public issue tracker →
        </a>
        <p>
          GitHub issues are public. Do not post passwords, sign-in links, account details, precise
          personal location, or other private information. This tracker is for website bugs.
        </p>
      </section>
      <section>
        <h2>Offer eligibility and redemption</h2>
        <p>
          Contact the merchant, event organizer, or official card provider through the source linked
          in the listing. The Student Steals project team cannot authorize an offer or change a provider’s
          requirements.
        </p>
      </section>
    </InformationPage>
  );
}
