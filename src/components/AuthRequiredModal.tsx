import { Link } from "@tanstack/react-router";
import { Modal, Btn } from "@/components/ui-bits";

export function AuthRequiredModal({
  open,
  onClose,
  action = "vote on deals",
}: {
  open: boolean;
  onClose: () => void;
  action?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Account Required">
      <div className="space-y-4 text-center sm:text-left">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl sm:mx-0">
          🔒
        </div>

        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Sign in to {action}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            To prevent ballot-stuffing and keep student community verification honest, an account is required to vote on or upvote deals.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/50 p-3.5 text-left text-xs">
          <p className="font-semibold text-foreground">Why do we require an account?</p>
          <ul className="mt-1.5 space-y-1 text-muted-foreground list-disc list-inside">
            <li>Strict 1-vote-per-deal limit so rankings stay trustworthy</li>
            <li>Lets you track your own submission and voting history</li>
            <li>Enables changing your vote later if a deal expires</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn type="button" variant="soft" onClick={onClose} className="text-xs">
            Cancel
          </Btn>
          <Link
            to="/signin"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-secondary px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-glass"
          >
            Sign In
          </Link>
          <Link
            to="/account"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </Modal>
  );
}
