import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Modal, Btn } from "@/components/ui-bits";
import { useSubmitFoodEventMutation, getLocalDateString, geocodeEventAddress } from "@/lib/food-events";
import { findCampusBuilding } from "@/lib/map-places";
import { useCampusBuildingsQuery, useCampusesQuery } from "@/lib/campus-buildings";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const isUuid = (val?: string | null): val is string =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export function SubmitFoodEventModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user } = useStore();
  const submitMutation = useSubmitFoodEventMutation();
  const { data: campusBuildings = [] } = useCampusBuildingsQuery();
  const { data: campuses = [] } = useCampusesQuery();

  const todayStr = getLocalDateString();

  const [title, setTitle] = useState("");
  const [host, setHost] = useState("");
  const [food, setFood] = useState("");
  const [eventDate, setEventDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [building, setBuilding] = useState("");
  const [locationType, setLocationType] = useState<"campus" | "off_campus">("campus");
  const [campusId, setCampusId] = useState("");
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to share a free food event.");
      return;
    }
    if (!title.trim() || !food.trim() || !building.trim() || !eventDate || (locationType === "off_campus" && !address.trim())) {
      toast.error("Please fill in event title, food type, date, and location.");
      return;
    }

    try {
      const selectedCampus = campuses.find((c) => c.id === campusId) || campuses[0];
      const validCampusId = isUuid(campusId)
        ? campusId
        : isUuid(selectedCampus?.id)
        ? selectedCampus.id
        : "eb801cfa-9f8f-43f5-89e0-6d056b4edcc4"; // BYU Provo UUID

      const availableBuildings = campusBuildings.filter(
        (item) => !validCampusId || item.campusId === validCampusId || !item.campusId
      );
      const selectedBuilding = locationType === "campus" ? findCampusBuilding(building, availableBuildings) : undefined;
      const validBuildingId = isUuid(selectedBuilding?.id) ? selectedBuilding.id : undefined;

      let coordinates: { latitude?: number; longitude?: number } = {};
      if (locationType === "off_campus") {
        try {
          coordinates = await geocodeEventAddress(address.trim());
        } catch {
          // If geocoding fails, proceed without coordinates or use address text
        }
      } else if (selectedBuilding && Number.isFinite(selectedBuilding.lat) && Number.isFinite(selectedBuilding.lng)) {
        coordinates = { latitude: selectedBuilding.lat as number, longitude: selectedBuilding.lng as number };
      } else if (selectedCampus && Number.isFinite(selectedCampus.lat) && Number.isFinite(selectedCampus.lng)) {
        coordinates = { latitude: selectedCampus.lat, longitude: selectedCampus.lng };
      }

      const defaultAddress = locationType === "campus"
        ? (address.trim() || (selectedBuilding ? `${selectedBuilding.name}, BYU, Provo, UT` : `${building.trim()}, BYU, Provo, UT`))
        : address.trim();

      const defaultHost = host.trim() || user.name || (user.username ? `@${user.username}` : "Student Host");

      await submitMutation.mutateAsync({
        title: title.trim(),
        host: defaultHost,
        food: food.trim(),
        event_date: eventDate,
        start_time: startTime ? `${startTime}:00` : "12:00:00",
        end_time: endTime ? `${endTime}:00` : "13:00:00",
        building: building.trim(),
        ...(validBuildingId ? { building_id: validBuildingId } : {}),
        ...(locationType === "campus" && validCampusId ? { campus_id: validCampusId } : {}),
        ...(defaultAddress ? { address: defaultAddress } : {}),
        ...coordinates,
        ...(room.trim() ? { room: room.trim() } : {}),
        ...(details.trim() ? { details: details.trim() } : {}),
        location_note: "Community shared event",
        verification_status: "community",
      });

      toast.success("Free food event shared with the campus community!");
      void router.invalidate();

      // Reset form
      setTitle("");
      setHost("");
      setFood("");
      setBuilding("");
      setAddress("");
      setRoom("");
      setDetails("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Database error";
      toast.error(`Could not submit event: ${msg}`);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Post a free food event">
      <div className="space-y-4">
        <div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            Community Submission
          </span>
          <h3 className="mt-2 text-xl font-bold">Post a Free Food Event</h3>
          <p className="text-xs text-muted-foreground">
            Share campus club meetings, department leftovers, or local student promos.
          </p>
        </div>

        {/* User Attribution / Account Enforcement Banner */}
        {user ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <span className="text-base">👤</span>
            <div>
              <p className="font-semibold text-foreground">
                Sharing as <span className="text-primary font-bold">@{user.username}</span> ({user.name})
              </p>
              <p className="text-muted-foreground">Your student account will be credited as the event source.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              Account required to share free food
            </p>
            <p className="mt-1 text-muted-foreground">
              Sign in so fellow students know who shared the alert and can trust the source.
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                to="/signin"
                onClick={onClose}
                className="rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Link>
              <Link
                to="/account"
                onClick={onClose}
                className="rounded-full bg-secondary px-3 py-1 font-medium ring-1 ring-border hover:bg-muted"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label htmlFor="event-title" className="block text-xs font-medium text-muted-foreground">
              Event Title *
            </label>
            <input
              type="text"
              id="event-title"
              required
              placeholder="e.g. CS Dept Pizza Social"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">Location type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setLocationType("campus")} className={`rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-border ${locationType === "campus" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>BYU campus</button>
              <button type="button" onClick={() => setLocationType("off_campus")} className={`rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-border ${locationType === "off_campus" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Off campus</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="event-host" className="block text-xs font-medium text-muted-foreground">
                Host / Organization
              </label>
              <input
                type="text"
                id="event-host"
                placeholder="e.g. BYU ACM / BYU Math"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="event-food" className="block text-xs font-medium text-muted-foreground">
                Food Offered *
              </label>
              <input
                type="text"
                id="event-food"
                required
                placeholder="e.g. Pizza & Sodas"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {locationType === "campus" && <div>
            <label htmlFor="event-campus" className="block text-xs font-medium text-muted-foreground">College campus</label>
            <select id="event-campus" value={campusId || campuses[0]?.id || ""} onChange={(event) => { setCampusId(event.target.value); setBuilding(""); }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
            </select>
          </div>}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="event-date" className="block text-xs font-medium text-muted-foreground">
                Date *
              </label>
              <input
                type="date"
                id="event-date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="event-start" className="block text-xs font-medium text-muted-foreground">
                Start Time
              </label>
              <input
                type="time"
                id="event-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="event-end" className="block text-xs font-medium text-muted-foreground">
                End Time
              </label>
              <input
                type="time"
                id="event-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="event-building" className="block text-xs font-medium text-muted-foreground">
                Building / Venue *
              </label>
              <input
                type="text"
                id="event-building"
                required
                list={locationType === "campus" ? "byu-map-buildings" : undefined}
                placeholder={locationType === "campus" ? "e.g. TNRB (Tanner Building)" : "e.g. Downtown Provo Library"}
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <datalist id="byu-map-buildings">
                {campusBuildings.filter((campusBuilding) => !campusId || campusBuilding.campusId === campusId || !campusBuilding.campusId).map((campusBuilding) => (
                  <option key={campusBuilding.id} value={campusBuilding.code ? `${campusBuilding.code} (${campusBuilding.name})` : campusBuilding.name} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-muted-foreground">{locationType === "campus" ? "Choose a suggested BYU building to show this event on the campus map." : "Name the venue; its address will place it on the area map."}</p>
            </div>
            <div>
              <label htmlFor="event-room" className="block text-xs font-medium text-muted-foreground">
                Room #
              </label>
              <input
                type="text"
                id="event-room"
                placeholder="e.g. Rm 1170"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {locationType === "off_campus" && <div>
            <label htmlFor="event-address" className="block text-xs font-medium text-muted-foreground">Street address *</label>
            <input id="event-address" autoComplete="street-address" type="text" required placeholder="e.g. 550 N University Ave, Provo, UT" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            <p className="mt-1 text-xs text-muted-foreground">We verify this address and place the event pin automatically.</p>
          </div>}

          <div>
            <label htmlFor="event-details" className="block text-xs font-medium text-muted-foreground">
              Additional Details
            </label>
            <textarea
              id="event-details"
              rows={2}
              placeholder="e.g. First-come first-served while supplies last."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="soft" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={submitMutation.isPending || !user}>
              {submitMutation.isPending ? "Posting..." : !user ? "Sign in to Publish" : "Publish Event"}
            </Btn>
          </div>
        </form>
      </div>
    </Modal>
  );
}
