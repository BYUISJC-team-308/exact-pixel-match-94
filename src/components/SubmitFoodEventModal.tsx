import { useState } from "react";
import { Modal, Btn } from "@/components/ui-bits";
import { useSubmitFoodEventMutation, getLocalDateString, geocodeEventAddress } from "@/lib/food-events";
import { campusBuildings } from "@/lib/map-places";
import { toast } from "sonner";

export function SubmitFoodEventModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const submitMutation = useSubmitFoodEventMutation();

  const todayStr = getLocalDateString();

  const [title, setTitle] = useState("");
  const [host, setHost] = useState("");
  const [food, setFood] = useState("");
  const [eventDate, setEventDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [building, setBuilding] = useState("");
  const [locationType, setLocationType] = useState<"campus" | "off_campus">("campus");
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !food.trim() || !building.trim() || !eventDate || (locationType === "off_campus" && !address.trim())) {
      toast.error("Please fill in event title, food type, date, and location.");
      return;
    }

    try {
      const coordinates = locationType === "off_campus" ? await geocodeEventAddress(address.trim()) : {};
      await submitMutation.mutateAsync({
        title: title.trim(),
        host: host.trim() || "Student Host",
        food: food.trim(),
        event_date: eventDate,
        start_time: startTime ? `${startTime}:00` : "12:00:00",
        end_time: endTime ? `${endTime}:00` : "13:00:00",
        building: building.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...coordinates,
        ...(room.trim() ? { room: room.trim() } : {}),
        ...(details.trim() ? { details: details.trim() } : {}),
      });

      toast.success("Free food event posted to Studeats!");
      // Reset form
      setTitle("");
      setHost("");
      setFood("");
      setBuilding("");
      setAddress("");
      setRoom("");
      setDetails("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      toast.error(`Could not submit event: ${msg}`);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
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

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Event Title *
            </label>
            <input
              type="text"
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Host / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. BYU ACM / BYU Math"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Food Offered *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pizza & Sodas"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Building / Venue *
              </label>
              <input
                type="text"
                required
                list={locationType === "campus" ? "byu-map-buildings" : undefined}
                placeholder={locationType === "campus" ? "e.g. TNRB (Tanner Building)" : "e.g. Downtown Provo Library"}
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <datalist id="byu-map-buildings">
                {campusBuildings.map((campusBuilding) => (
                  <option key={campusBuilding.id} value={campusBuilding.code ? `${campusBuilding.code} (${campusBuilding.name})` : campusBuilding.name} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-muted-foreground">{locationType === "campus" ? "Choose a suggested BYU building to show this event on the campus map." : "Name the venue; its address will place it on the area map."}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Room #
              </label>
              <input
                type="text"
                placeholder="e.g. Rm 1170"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {locationType === "off_campus" && <div>
            <label className="block text-xs font-medium text-muted-foreground">Street address *</label>
            <input type="text" required placeholder="e.g. 550 N University Ave, Provo, UT" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            <p className="mt-1 text-xs text-muted-foreground">We verify this address and place the event pin automatically.</p>
          </div>}

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Additional Details
            </label>
            <textarea
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
            <Btn type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Posting..." : "Publish Event"}
            </Btn>
          </div>
        </form>
      </div>
    </Modal>
  );
}
