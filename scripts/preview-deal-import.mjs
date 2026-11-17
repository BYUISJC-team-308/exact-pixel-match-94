import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { getSupabasePublicClient } from "./db.js";

const comparisonFields = ["value", "description", "how_to_redeem", "url", "category", "deal_type"];
const requiredFields = ["company", "title", "eligibility", ...comparisonFields];
const trackingParams = /^(utm_.+|gclid|fbclid|msclkid)$/i;

function normalize(text) {
  return (text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (trackingParams.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    const host = url.host.replace(/^www\./, "");
    return `${host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return null;
  }
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function planDealImport(snapshot, existingDeals, asOf) {
  if (
    !validDate(snapshot?.checked_on) ||
    !validDate(asOf) ||
    snapshot.checked_on > asOf ||
    !Array.isArray(snapshot.offers) ||
    !snapshot.offers.length
  ) {
    throw new Error(
      "Expected a nonempty offers array and a valid checked_on date on or before today.",
    );
  }

  const validOffers = snapshot.offers.map(
    (offer) =>
      requiredFields.every((field) => typeof offer?.[field] === "string" && offer[field].trim()) &&
      normalize(offer.company) &&
      normalize(offer.title) &&
      canonicalUrl(offer.url) &&
      (offer.expires_on == null || validDate(offer.expires_on)),
  );

  const entries = snapshot.offers.map((offer, index) => {
    const listing = {
      row: index + 1,
      company: offer?.company,
      title: offer?.title,
      url: offer?.url,
    };
    if (!validOffers[index])
      return { ...listing, status: "review", reason: "Invalid or missing offer data" };
    if (offer.expires_on && offer.expires_on < asOf) {
      return { ...listing, status: "review", reason: "Offer has expired" };
    }

    const sameCompany = (other) => normalize(other.company) === normalize(offer.company);
    const sameOffer = (other) =>
      sameCompany(other) &&
      (normalize(other.title) === normalize(offer.title) ||
        canonicalUrl(other.url) === canonicalUrl(offer.url));

    if (
      snapshot.offers.some(
        (other, otherIndex) => otherIndex !== index && validOffers[otherIndex] && sameOffer(other),
      )
    ) {
      return { ...listing, status: "review", reason: "Duplicate candidate in this batch" };
    }

    const merchantListings = existingDeals.filter(sameCompany);
    const matches = merchantListings.filter(sameOffer);
    if (matches.length === 1) {
      const existing = matches[0];
      const changes = comparisonFields
        .filter((field) => offer[field].trim() !== existing[field]?.trim())
        .map((field) => ({ field, before: existing[field], after: offer[field] }));
      return {
        ...listing,
        status: changes.length ? "update" : "unchanged",
        existingId: existing.id,
        changes,
      };
    }
    if (merchantListings.length) {
      return {
        ...listing,
        status: "review",
        reason: matches.length
          ? "Matches multiple listings"
          : "Merchant already listed with different terms or link",
        existingListings: (matches.length ? matches : merchantListings).map(
          ({ id, title, url }) => ({ id, title, url }),
        ),
      };
    }
    return { ...listing, status: "add" };
  });

  const matchedIds = new Map();
  for (const { existingId } of entries) {
    if (existingId) matchedIds.set(existingId, (matchedIds.get(existingId) ?? 0) + 1);
  }
  const counts = { add: 0, update: 0, unchanged: 0, review: 0 };
  const reviewedEntries = entries.map((entry) => {
    if (matchedIds.get(entry.existingId) > 1) {
      const { changes: _changes, ...listing } = entry;
      counts.review++;
      return { ...listing, status: "review", reason: "Multiple candidates match the same listing" };
    }
    counts[entry.status]++;
    return entry;
  });
  return {
    mode: "dry-run",
    checkedOn: snapshot.checked_on,
    asOf,
    existingCount: existingDeals.length,
    counts,
    entries: reviewedEntries,
  };
}

async function readDeals() {
  const client = getSupabasePublicClient();
  const pageSize = 100;
  const deals = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("deals")
      .select(`id,company,title,${comparisonFields.join(",")}`)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not read the current catalog: ${error.message}`);
    deals.push(...data);
    if (data.length < pageSize) return deals;
  }
}

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true });
  if (positionals.length !== 1) throw new Error("Usage: npm run preview:deals -- <offers.json>");
  const snapshot = JSON.parse(await readFile(positionals[0], "utf8"));
  const deals = await readDeals();
  console.log(
    JSON.stringify(planDealImport(snapshot, deals, new Date().toISOString().slice(0, 10)), null, 2),
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
