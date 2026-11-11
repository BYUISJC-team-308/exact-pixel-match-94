import { useEffect, useState } from "react";

// The route loader serializes this instant with SSR HTML. Hydration must use
// that same value, even if the browser loads across midnight/a minute boundary.
// Only after commit do we read the browser clock. Refresh on a new loader
// snapshot; no polling that would repeatedly rebuild the map while panning.
export function useRenderClock(renderedAt: number) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    setNow(Date.now());
  }, [renderedAt]);
  return now;
}
