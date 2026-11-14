import { useCallback, useEffect, useRef, useState } from "react";

export interface CategoryFilterBarProps<T extends string> {
  categories: readonly T[];
  selectedCategory: T;
  onChange: (category: T) => void;
  icons?: Record<string, string>;
  counts?: Record<string, number>;
  ariaLabel?: string;
  className?: string;
}

export function CategoryFilterBar<T extends string>({
  categories,
  selectedCategory,
  onChange,
  icons = {},
  counts = {},
  ariaLabel = "Filter by category",
  className = "",
}: CategoryFilterBarProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compute scroll boundaries to toggle gradient fades and chevron scroll buttons
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories]);

  // Smooth scroll helper for chevron buttons
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el || typeof el.scrollBy !== "function") return;
    const scrollAmount = direction === "left" ? -260 : 260;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Auto-scroll selected category into view when changed externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[data-active="true"]');
    if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedCategory]);

  const isFiltered =
    selectedCategory !== "All categories" &&
    selectedCategory !== "All" &&
    selectedCategory !== "all";

  const allCategoryOption = categories.find(
    (c) => c === "All categories" || c === "All" || c === "all",
  ) ?? categories[0];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Category Ribbon Container with Gradient Masks and Scroll Chevrons */}
      <div className="relative group/categories" role="region" aria-label={ariaLabel}>
        {/* Left Gradient Fade Mask */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background via-background/80 to-transparent z-10 transition-opacity duration-200 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Left Scroll Chevron Button (Desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll categories left"
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-1 ring-border/80 hover:bg-secondary hover:scale-105 active:scale-95 transition-all"
          >
            <span aria-hidden="true" className="text-sm font-bold">‹</span>
          </button>
        )}

        {/* Horizontal Category Scroll Rail */}
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label={ariaLabel}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 focus:outline-none"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const icon = icons[cat];
            const count = counts[cat];

            return (
              <button
                key={cat}
                type="button"
                aria-label={cat}
                aria-pressed={isSelected}
                data-active={isSelected}
                onClick={() => onChange(cat)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/80 font-semibold scale-[1.02]"
                    : "bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground ring-1 ring-border/60 hover:ring-border active:scale-95"
                }`}
              >
                {icon && (
                  <span
                    aria-hidden="true"
                    className="text-base leading-none transition-transform duration-200 group-hover:scale-110"
                  >
                    {icon}
                  </span>
                )}
                <span className="whitespace-nowrap">
                  {cat === "All categories" ? "All Categories" : cat}
                </span>
                {typeof count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums transition-colors ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Chevron Button (Desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll categories right"
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-1 ring-border/80 hover:bg-secondary hover:scale-105 active:scale-95 transition-all"
          >
            <span aria-hidden="true" className="text-sm font-bold">›</span>
          </button>
        )}

        {/* Right Gradient Fade Mask */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background via-background/80 to-transparent z-10 transition-opacity duration-200 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Contextual Active Filter Indicator & One-Click Reset */}
      {isFiltered && allCategoryOption && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground animate-fadeIn">
          <span>
            Showing <strong>{counts[selectedCategory] ?? ""}</strong> {icons[selectedCategory] || ""} {selectedCategory} deals
          </span>
          <span>•</span>
          <button
            type="button"
            onClick={() => onChange(allCategoryOption)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary/80 hover:bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground ring-1 ring-border/60 hover:ring-border transition-colors cursor-pointer"
            title="Reset to all categories"
          >
            <span>✕</span>
            <span>Show all</span>
          </button>
        </div>
      )}
    </div>
  );
}
