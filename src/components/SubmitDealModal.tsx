import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Modal, Btn } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { useSubmitDealMutation } from "@/lib/deal-verification";
import type { DealCategory } from "@/lib/data";

const CATEGORIES: DealCategory[] = [
  "Food",
  "Tech",
  "Apparel",
  "Fitness",
  "Subscription",
  "AI",
  "Groceries",
  "Travel",
  "Print",
];

export function SubmitDealModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useStore();
  const submitMutation = useSubmitDealMutation();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<DealCategory>("Food");
  const [type, setType] = useState<"Percent off" | "Free" | "Fixed price">("Percent off");
  const [howTo, setHowTo] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Provo");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to share a community deal.");
      return;
    }
    if (!title.trim() || !company.trim() || !value.trim()) {
      toast.error("Please fill in Deal Title, Company Name, and Discount Value.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        title: title.trim(),
        company: company.trim(),
        category,
        deal_type: type,
        value: value.trim(),
        description: description.trim() || undefined,
        how_to_redeem: howTo.trim() || "Show your valid student ID at checkout.",
        url: url.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        verification_status: "community",
      });

      toast.success("Community deal submitted! It is now live for student verification.");

      // Reset form
      setTitle("");
      setCompany("");
      setValue("");
      setCategory("Food");
      setType("Percent off");
      setHowTo("");
      setDescription("");
      setUrl("");
      setAddress("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      toast.error(`Could not submit deal: ${msg}`);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Submit a Student Deal">
      <div className="space-y-4">
        <div>
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
            👥 Community Submission
          </span>
          <h3 className="mt-2 text-xl font-bold">Share a Student Deal</h3>
          <p className="text-xs text-muted-foreground">
            Spotted a student discount in Provo or online? Share it with fellow students for community verification.
          </p>
        </div>

        {/* User Attribution Banner */}
        {user ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <span className="text-base">👤</span>
            <div>
              <p className="font-semibold text-foreground">
                Posting as <span className="text-primary font-bold">@{user.username}</span> ({user.name})
              </p>
              <p className="text-muted-foreground">Your account will be attributed as the deal author.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              Account required for community verification
            </p>
            <p className="mt-1 text-muted-foreground">
              Sign in so other students can trust your submission and give you credit.
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="deal-title" className="block text-xs font-medium text-muted-foreground">
                Deal Title *
              </label>
              <input
                type="text"
                id="deal-title"
                required
                placeholder="e.g. 20% Off Entire Meal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="deal-company" className="block text-xs font-medium text-muted-foreground">
                Business / Company Name *
              </label>
              <input
                type="text"
                id="deal-company"
                required
                placeholder="e.g. Waffle Love"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="deal-value" className="block text-xs font-medium text-muted-foreground">
                Discount Value *
              </label>
              <input
                type="text"
                id="deal-value"
                required
                placeholder="e.g. 20% off, Free Drink"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="deal-cat" className="block text-xs font-medium text-muted-foreground">
                Category *
              </label>
              <select
                id="deal-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as DealCategory)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="deal-type" className="block text-xs font-medium text-muted-foreground">
                Deal Type
              </label>
              <select
                id="deal-type"
                value={type}
                onChange={(e) => setType(e.target.value as "Percent off" | "Free" | "Fixed price")}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Percent off">Percent off</option>
                <option value="Free">Free</option>
                <option value="Fixed price">Fixed price / Special</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="deal-url" className="block text-xs font-medium text-muted-foreground">
                Offer Website / Menu Link
              </label>
              <input
                type="url"
                id="deal-url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="deal-howto" className="block text-xs font-medium text-muted-foreground">
                How to Redeem
              </label>
              <input
                type="text"
                id="deal-howto"
                placeholder="e.g. Flash BYU/UVU student ID at checkout"
                value={howTo}
                onChange={(e) => setHowTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="deal-address" className="block text-xs font-medium text-muted-foreground">
                Store Location / Address (Optional)
              </label>
              <input
                type="text"
                id="deal-address"
                placeholder="e.g. 1800 N State St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="deal-city" className="block text-xs font-medium text-muted-foreground">
                City
              </label>
              <input
                type="text"
                id="deal-city"
                placeholder="e.g. Provo, Orem"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="deal-desc" className="block text-xs font-medium text-muted-foreground">
              Offer Details / Restrictions (Optional)
            </label>
            <textarea
              id="deal-desc"
              rows={2}
              placeholder="e.g. Valid dine-in only with purchase of a drink. Cannot be combined with coupons."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="soft" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={!user || submitMutation.isPending}>
              {submitMutation.isPending ? "Posting..." : "Share Deal"}
            </Btn>
          </div>
        </form>
      </div>
    </Modal>
  );
}
