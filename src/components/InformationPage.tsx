import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function InformationPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl py-6 sm:py-10">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        ← Back home
      </Link>
      <header className="mt-3 border-b border-border pb-6">
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{intro}</p>
      </header>
      <div className="space-y-7 pt-6 text-sm leading-7 [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_p+p]:mt-3 [&_a]:break-words [&_a]:rounded [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:focus-visible:outline-2 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
