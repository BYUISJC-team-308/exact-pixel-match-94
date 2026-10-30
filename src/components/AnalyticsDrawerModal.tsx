import { Modal, Btn } from "@/components/ui-bits";
import {
  useAnalyticsMetricsQuery,
  useSimulateEventMutation,
  logActivityEvent,
} from "@/lib/analytics";
import { toast } from "sonner";

export function AnalyticsDrawerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: metrics, isLoading, refetch } = useAnalyticsMetricsQuery();
  const simulateMutation = useSimulateEventMutation();

  const handleSimulateJourney = async () => {
    try {
      const simDeviceId = `sim-user-${Math.floor(Math.random() * 1000)}`;
      // 1. Session start
      await logActivityEvent("session_start", { simUser: simDeviceId });
      // 2. Signup
      await logActivityEvent("signup", { simUser: simDeviceId });
      // 3. Deal saved 2.5 minutes later
      await logActivityEvent("deal_saved", {
        simUser: simDeviceId,
        dealId: "d1",
        simulatedDelayMinutes: 2.5,
      });

      toast.success("Simulated user journey logged (Signup → Deal Saved in 2.5m)!");
      refetch();
    } catch {
      toast.error("Simulation failed");
    }
  };

  const handleQuickLog = async (eventType: "deal_saved" | "return_visit" | "deal_redeemed") => {
    try {
      await simulateMutation.mutateAsync({ eventType });
      toast.success(`Logged '${eventType}' event!`);
    } catch {
      toast.error("Failed to log event");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                Sprint Analytics
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Feature 11
              </span>
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight">
              UX Flow & OKR Benchmarks
            </h3>
            <p className="text-xs text-muted-foreground">
              Automated timestamp analytics measuring student onboarding velocity and retention.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Calculating timestamp metrics...
          </div>
        ) : (
          <div className="space-y-3">
            {/* OKR 1.1: Average Time to First Deal Saved */}
            <div className="rounded-xl border border-border/80 bg-glass/60 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    OKR 1.1 · Time to First Save
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-primary">
                      {metrics?.avgMinutesToFirstSave != null
                        ? `${metrics.avgMinutesToFirstSave} min`
                        : "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground">average</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Target: &lt; 5 mins
                  </span>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Fast onboarding flow
                  </p>
                </div>
              </div>
            </div>

            {/* OKR 1.2: Users with Saved Deals */}
            <div className="rounded-xl border border-border/80 bg-glass/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground uppercase text-[10px]">
                  OKR 1.2 · Users Saving Deals
                </span>
                <span className="text-foreground">
                  {metrics?.userSaveConversionRate || 0}% / 50% Target
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{
                    width: `${Math.min(metrics?.userSaveConversionRate || 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* OKR 2.1: Discount Redemption Rate */}
            <div className="rounded-xl border border-border/80 bg-glass/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground uppercase text-[10px]">
                  OKR 2.1 · Deal Redemptions
                </span>
                <span className="text-foreground">
                  {metrics?.redemptionRate || 0}% / 60% Target
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gold transition-all duration-500"
                  style={{
                    width: `${Math.min(metrics?.redemptionRate || 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* OKR 2.2: 7-Day Return and Save Rate */}
            <div className="rounded-xl border border-border/80 bg-glass/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground uppercase text-[10px]">
                  OKR 2.2 · 7-Day Return Rate
                </span>
                <span className="text-foreground">
                  {metrics?.sevenDayReturnRate || 0}% / 75% Target
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(metrics?.sevenDayReturnRate || 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Activity Event Breakdown */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Logged Event Volume ({metrics?.totalEventsLogged || 0} total)
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.entries(metrics?.eventsByType || {}).map(([type, count]) => (
                  <span
                    key={type}
                    className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
                  >
                    {type}: <strong className="text-primary">{count}</strong>
                  </span>
                ))}
                {Object.keys(metrics?.eventsByType || {}).length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No events logged yet. Click simulation below!
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Testing / Demo Simulator */}
            <div className="rounded-xl border border-dashed border-border/80 p-3 bg-muted/20">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                Sprint Demo Controls
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={handleSimulateJourney}
                  className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  ⚡ Simulate User Journey (3m)
                </button>
                <button
                  onClick={() => handleQuickLog("deal_saved")}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium ring-1 ring-border hover:bg-glass"
                >
                  + Deal Saved
                </button>
                <button
                  onClick={() => handleQuickLog("return_visit")}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium ring-1 ring-border hover:bg-glass"
                >
                  + Return Visit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Btn variant="soft" onClick={() => refetch()} className="text-xs">
            🔄 Refresh
          </Btn>
          <Btn onClick={onClose} className="text-xs">
            Close
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
