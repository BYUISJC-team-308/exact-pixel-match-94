import { useState } from "react";
import { Modal, Btn } from "@/components/ui-bits";
import { useSubmitFoodEventMutation, getLocalDateString } from "@/lib/food-events";
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
  const [room, setRoom] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !food.trim() || !building.trim() || !eventDate) {
      toast.error("Please fill in event title, food type, date, and location.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        title: title.trim(),
        host: host.trim() || "Student Host",
        food: food.trim(),
        event_date: eventDate,
        start_time: startTime ? `${startTime}:00` : "12:00:00",
        end_time: endTime ? `${endTime}:00` : "13:00:00",
        building: building.trim(),
        room: room.trim() || undefined,
        details: details.trim() || undefined,
      });

      toast.success("Free food event posted to Studeats!");
      // Reset form
      setTitle("");
      setHost("");
      setFood("");
      setBuilding("");
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
                placeholder="e.g. TMCB or WSC"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
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
