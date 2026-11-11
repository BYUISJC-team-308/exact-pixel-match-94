import { supabase } from "@/lib/supabase";

const visitKey = "studeats-activity-visit";
const deviceKey = "studeats-device-id";
const visitTimeout = 30 * 60_000;
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
type Visit = { id: string; lastActivity: number };
let memoryVisit: Visit | undefined;
let memoryDevice: string | undefined;

function trackingEnabled() {
  return typeof window !== "undefined" && window.location.hostname === "studeats.vercel.app";
}

function visitId() {
  const now = Date.now();
  let current = memoryVisit;
  try {
    const stored = sessionStorage.getItem(visitKey);
    if (stored) current = JSON.parse(stored);
  } catch {
    // Restricted storage still permits tracking for the current page.
  }
  const id =
    current &&
    uuid.test(current.id) &&
    now >= current.lastActivity &&
    now - current.lastActivity < visitTimeout
      ? current.id
      : crypto.randomUUID();
  memoryVisit = { id, lastActivity: now };
  try {
    sessionStorage.setItem(visitKey, JSON.stringify(memoryVisit));
  } catch {
    // Use the in-memory visit.
  }
  return id;
}

function deviceId() {
  try {
    const stored = localStorage.getItem(deviceKey);
    if (stored && uuid.test(stored)) return stored;
    const id = (memoryDevice ??= crypto.randomUUID());
    localStorage.setItem(deviceKey, id);
    return id;
  } catch {
    return (memoryDevice ??= crypto.randomUUID());
  }
}

export function signupActivityMetadata() {
  return trackingEnabled()
    ? { studeats_signup_visit: visitId(), studeats_signup_device: deviceId() }
    : {};
}

export function endActivityVisit() {
  memoryVisit = undefined;
  try {
    sessionStorage.removeItem(visitKey);
  } catch {
    // Nothing persisted.
  }
}

export async function logActivityEvent(
  eventType: string,
  metadata: Record<string, unknown> = {},
  expectedAccount?: string,
) {
  if (!trackingEnabled()) return;
  const visit = visitId();
  const eventId = crypto.randomUUID();
  try {
    const { data } = await supabase.auth.getSession();
    const account = data.session?.user.id;
    if (!account || (expectedAccount && expectedAccount !== account)) return;
    const item =
      metadata["dealId"] ?? metadata["eventId"] ?? metadata["offerId"] ?? metadata["placeId"];
    const { error } = await supabase.rpc("record_studeats_activity", {
      p_event_id: eventId,
      p_visit_id: visit,
      p_device_id: deviceId(),
      p_expected_user: account,
      p_event_type: eventType,
      p_item_id: typeof item === "string" ? item : null,
    });
    if (error) console.warn("Activity tracking failed:", error.code);
  } catch {
    console.warn("Activity tracking failed.");
  }
}
