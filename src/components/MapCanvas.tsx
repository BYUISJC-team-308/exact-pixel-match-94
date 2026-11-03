import { useEffect, useRef } from "react";
import type { MapPlace } from "@/lib/map-places";
import type { SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

type Props = {
  places: MapPlace[];
  view: "area" | "campus";
  onSelect: (place: MapPlace) => void;
  onOpenOffer: (offer: SSDeal) => void;
  onOpenEvent: (event: NormalizedFoodEvent) => void;
};

const mapTilerKey = import.meta.env["VITE_MAPTILER_KEY"];
const mapStyle = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : "https://tiles.openfreemap.org/styles/liberty";

export function MapCanvas({ places, view, onSelect, onOpenOffer, onOpenEvent }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onOpenOfferRef = useRef(onOpenOffer);
  const onOpenEventRef = useRef(onOpenEvent);
  onSelectRef.current = onSelect;
  onOpenOfferRef.current = onOpenOffer;
  onOpenEventRef.current = onOpenEvent;

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let mobileCard: HTMLDivElement | undefined;
    const byId = new Map(places.map((place) => [place.id, place]));
    const isMobileMap = () => window.matchMedia("(max-width: 640px)").matches;

    void import("maplibre-gl").then(({ GeolocateControl, Map: MapLibreMap, NavigationControl, Popup, setWorkerUrl }) => {
      if (cancelled || !container.current) return;
      setWorkerUrl(workerUrl);
      map = new MapLibreMap({
        container: container.current,
        style: mapStyle,
        center: view === "campus" && places.length === 1 && places[0] ? [places[0].lng, places[0].lat] : view === "campus" ? [-111.6502, 40.2487] : [-111.664, 40.264],
        zoom: view === "campus" && places.length === 1 ? 17 : view === "campus" ? 15.3 : 10.2,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: {},
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      if (view === "area") {
        map.addControl(new GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
          fitBoundsOptions: { maxZoom: 14 },
        }), "top-right");
      }
      const showPlacePopup = (place: MapPlace, coordinates: [number, number]) => {
        if (!map) return;
        mobileCard?.remove();
        mobileCard = undefined;
        const content = document.createElement("div");
        content.className = "map-place-card text-foreground";

        const eyebrow = document.createElement("p");
        eyebrow.className = "text-[11px] font-semibold uppercase tracking-wide text-primary";
        eyebrow.textContent = place.kind === "building" ? (place.code || "BYU building") : place.events.length ? "Free food event" : "Starving Student Card";

        const title = document.createElement("strong");
        title.className = "mt-1 block text-sm leading-snug";
        title.textContent = place.title;

        const address = document.createElement("p");
        address.className = "mt-1 text-xs leading-relaxed text-muted-foreground";
        address.textContent = place.address;

        const directions = document.createElement("a");
        directions.className = "mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-primary underline";
        directions.href = `https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`;
        directions.target = "_blank";
        directions.rel = "noopener noreferrer";
        directions.textContent = "Get directions ↗";

        const items = document.createElement("div");
        items.className = "mt-3 max-h-56 space-y-2 overflow-y-auto pr-1";

        for (const offer of place.cardOffers) {
          const offerButton = document.createElement("button");
          offerButton.type = "button";
          offerButton.className = "block min-h-12 w-full rounded-xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary";
          offerButton.innerHTML = `<span class="block text-[10px] font-semibold uppercase text-primary">Starving Student offer</span><strong class="mt-0.5 block text-xs leading-snug"></strong><span class="mt-1 block text-[11px] text-muted-foreground"></span>`;
          const strong = offerButton.querySelector("strong");
          const meta = offerButton.querySelector("span:last-child");
          if (strong) strong.textContent = offer.item;
          if (meta) meta.textContent = `${offer.value} · Open offer details →`;
          offerButton.addEventListener("click", () => onOpenOfferRef.current(offer));
          items.append(offerButton);
        }

        for (const event of place.events) {
          const eventButton = document.createElement("button");
          eventButton.type = "button";
          eventButton.className = "block min-h-12 w-full rounded-xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary";
          const eventLabel = document.createElement("span");
          eventLabel.className = "block text-[10px] font-semibold uppercase text-amber-700";
          eventLabel.textContent = "Free food event";
          const eventTitle = document.createElement("strong");
          eventTitle.className = "mt-0.5 block text-xs leading-snug";
          eventTitle.textContent = event.title;
          const eventMeta = document.createElement("span");
          eventMeta.className = "mt-1 block text-[11px] leading-snug text-muted-foreground";
          eventMeta.textContent = `${event.food} · ${event.formattedDate}, ${event.formattedTime}${event.room ? ` · Room ${event.room}` : ""} · Open event details →`;
          eventButton.append(eventLabel, eventTitle, eventMeta);
          eventButton.addEventListener("click", () => onOpenEventRef.current(event));
          items.append(eventButton);
        }

        if (!place.cardOffers.length && !place.events.length) {
          const empty = document.createElement("p");
          empty.className = "mt-3 rounded-lg bg-secondary p-2 text-xs text-muted-foreground";
          empty.textContent = "No upcoming free food events at this building.";
          items.append(empty);
        }

        content.append(eyebrow, title, address, directions, items);
        if (isMobileMap() && container.current) {
          mobileCard = document.createElement("div");
          mobileCard.className = "absolute inset-x-3 bottom-3 z-10 max-h-[72%] overflow-hidden rounded-2xl border border-border bg-popover p-4 pr-11 shadow-float";
          mobileCard.setAttribute("role", "dialog");
          mobileCard.setAttribute("aria-label", `${place.title} map details`);

          const close = document.createElement("button");
          close.type = "button";
          close.className = "absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-muted text-base font-semibold text-foreground";
          close.setAttribute("aria-label", "Close map details");
          close.textContent = "×";
          close.addEventListener("click", () => {
            mobileCard?.remove();
            mobileCard = undefined;
          });

          items.className = "mt-3 max-h-[250px] space-y-2 overflow-y-auto overscroll-contain pr-1";
          mobileCard.append(content, close);
          container.current.append(mobileCard);
          mobileCard.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        new Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "320px" })
          .setLngLat(coordinates)
          .setDOMContent(content)
          .addTo(map);
      };
      map.on("load", () => {
        if (!map) return;
        if (view === "campus") {
          map.addSource("buildings", {
            type: "geojson",
            data: { type: "FeatureCollection", features: places.map((place) => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [place.lng, place.lat] },
              properties: { id: place.id, code: place.code || place.title, name: place.title },
            })) },
          });
          map.addLayer({ id: "building-points", type: "circle", source: "buildings", paint: {
            "circle-color": "#fff", "circle-radius": 5, "circle-stroke-color": "#245b4d", "circle-stroke-width": 1.5,
          } });
          map.addLayer({ id: "building-labels", type: "symbol", source: "buildings", minzoom: 14.5, layout: {
            "text-field": ["step", ["zoom"], ["get", "code"], 17, ["get", "name"]],
            "text-font": ["Roboto Regular", "Noto Sans Regular"],
            "text-size": 12, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true,
          }, paint: { "text-color": "#173e34", "text-halo-color": "#fff", "text-halo-width": 2 } });
          for (const layer of ["building-points", "building-labels"]) {
            map.on("click", layer, (event) => {
              if (map?.queryRenderedFeatures(event.point, { layers: ["place-points"] }).length) return;
              const place = byId.get(event.features?.[0]?.properties?.["id"]);
              if (place) {
                if (!isMobileMap()) onSelectRef.current(place);
                showPlacePopup(place, [place.lng, place.lat]);
              }
            });
            map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
          }
        }
        map.addSource("places", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: places.filter((place) => view !== "campus" || place.events.length > 0).map((place) => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [place.lng, place.lat] },
              properties: { id: place.id, kind: place.events.length > 0 ? "event" : place.kind },
            })),
          },
          cluster: true,
          clusterMaxZoom: view === "campus" ? 16 : 13,
          clusterRadius: 42,
        });
        map.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"], paint: {
          "circle-color": "#245b4d", "circle-radius": ["step", ["get", "point_count"], 20, 20, 26, 100, 34],
          "circle-stroke-color": "#fff", "circle-stroke-width": 2,
        } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"], layout: {
          "text-field": ["get", "point_count_abbreviated"], "text-size": 13,
        }, paint: { "text-color": "#fff" } });
        map.addLayer({ id: "place-points", type: "circle", source: "places", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": ["match", ["get", "kind"], "event", "#e3a629", "#245b4d"],
          "circle-radius": 11, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
        } });
        map.on("click", "place-points", (event) => {
          const id = event.features?.[0]?.properties?.["id"];
          const place = byId.get(id);
          if (place) {
            if (!isMobileMap()) onSelectRef.current(place);
            showPlacePopup(place, [place.lng, place.lat]);
          }
        });
        map.on("click", "clusters", async (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const source = map?.getSource("places") as import("maplibre-gl").GeoJSONSource | undefined;
          if (!source) return;
          const zoom = await source.getClusterExpansionZoom(feature.properties?.["cluster_id"]);
          map?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
        });
        for (const layer of ["clusters", "place-points"]) {
          map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
        }
      });
    });
    return () => { cancelled = true; mobileCard?.remove(); map?.remove(); };
  }, [places, view]);

  return <div ref={container} className="relative h-[440px] w-full overflow-hidden rounded-2xl sm:h-[600px]" aria-label={view === "campus" ? "BYU campus events map" : "Area discounts and free food map"} />;
}
