import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "How it works — Student Steals" }] }),
  component: Help,
});

function Help() {
  return (
    <div className="mx-auto max-w-2xl py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
      >
        ← Back home
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">Find your way to a good deal.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        You can browse without an account. Here’s what each section is for.
      </p>
      <div className="mt-6 space-y-4">
        <section className="glass p-5">
          <h2 className="text-xl font-semibold">Student discounts</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Explore online and local offers. Open the details for eligibility and redemption
            instructions, then check current terms with the provider.
          </p>
          <Link
            to="/discounts"
            className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
          >
            Browse discounts →
          </Link>
        </section>
        <section className="glass p-5">
          <h2 className="text-xl font-semibold">Starving Student Card</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Browse cardholder offers and track your personal use. An active card may be required.
            Some card offers require a purchase. Confirm terms in the official card portal; our
            tracker does not redeem an offer with a merchant.
          </p>
          <Link
            to="/starving-student"
            className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
          >
            Open card offers →
          </Link>
        </section>
        <section className="glass p-5">
          <h2 className="text-xl font-semibold">Free food events</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Check the date, time, food, building, room, and any attendance requirements. Use the
            calendar to plan a day and the map to find a location. Event details can change.
          </p>
          <Link
            to="/free-food"
            className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
          >
            Find free food →
          </Link>
        </section>
        <section className="rounded-2xl border border-border bg-white/60 p-5">
          <h2 className="text-xl font-semibold">Your saved finds</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Tap the save icon on a discount or event, then open My Hub on the home page. Saved items
            and card-use tracking currently stay on this browser; they do not yet sync between
            devices or accounts.
          </p>
          <a
            href="/#my-hub"
            className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
          >
            Go to My Hub →
          </a>
        </section>
        <section className="rounded-2xl border border-border bg-white/60 p-5">
          <h2 className="text-xl font-semibold">What an account does</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Create an account to keep your name, school, and optional profile photo. Signing in does
            not yet sync saved discounts, events, or card-use tracking between browsers.
          </p>
          <Link
            to="/account"
            className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline focus-visible:outline-2"
          >
            Create account →
          </Link>
        </section>
      </div>
    </div>
  );
}
