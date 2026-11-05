import { useEffect, useRef } from "react";
import type { MapPlace } from "@/lib/map-places";
import type { Deal, SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";
import { logActivityEvent } from "@/lib/analytics";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

type Props = {
  places: MapPlace[];
  view: "area" | "campus";
  showInactiveBuildings: boolean;
  focusPlaceId: string | null;
  onSelect: (place: MapPlace) => void;
  onOpenOffer: (offer: SSDeal) => void;
  onOpenEvent: (event: NormalizedFoodEvent) => void;
  onOpenDeal: (deal: Deal) => void;
  onUserLocation: (location: { lat: number; lng: number }) => void;
};

const mapTilerKey = import.meta.env["VITE_MAPTILER_KEY"];
const mapStyle = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : "https://tiles.openfreemap.org/styles/liberty";

function createMapIcon(kind: "card" | "event" | "discount") {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext("2d");
  if (!context) return new ImageData(40, 40);
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (kind === "card") {
    context.beginPath();
    context.roundRect(6, 9, 28, 22, 4);
    context.stroke();
    context.beginPath();
    context.moveTo(7, 16);
    context.lineTo(33, 16);
    context.stroke();
    context.fillRect(10, 22, 9, 3);
  } else if (kind === "event") {
    context.beginPath();
    context.moveTo(10, 7);
    context.lineTo(10, 33);
    context.moveTo(6, 7);
    context.lineTo(6, 17);
    context.quadraticCurveTo(10, 21, 14, 17);
    context.lineTo(14, 7);
    context.moveTo(28, 7);
    context.quadraticCurveTo(22, 12, 24, 23);
    context.lineTo(24, 33);
    context.moveTo(28, 7);
    context.lineTo(28, 33);
    context.stroke();
  } else {
    context.font = "bold 27px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("%", 20, 20);
  }
  return context.getImageData(0, 0, 40, 40);
}

export function MapCanvas({ places, view, showInactiveBuildings, focusPlaceId, onSelect, onOpenOffer, onOpenEvent, onOpenDeal, onUserLocation }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onOpenOfferRef = useRef(onOpenOffer);
  const onOpenEventRef = useRef(onOpenEvent);
  const onOpenDealRef = useRef(onOpenDeal);
  const onUserLocationRef = useRef(onUserLocation);
  onSelectRef.current = onSelect;
  onOpenOfferRef.current = onOpenOffer;
  onOpenEventRef.current = onOpenEvent;
  onOpenDealRef.current = onOpenDeal;
  onUserLocationRef.current = onUserLocation;

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let mobileCard: HTMLDivElement | undefined;
    let recenterButton: HTMLButtonElement | undefined;
    const byId = new Map(places.map((place) => [place.id, place]));
    const isMobileMap = () => window.matchMedia("(max-width: 640px)").matches;

    void import("maplibre-gl").then(({ GeolocateControl, LngLatBounds, Map: MapLibreMap, NavigationControl, Popup, setWorkerUrl }) => {
      if (cancelled || !container.current) return;
      setWorkerUrl(workerUrl);
      const focusedPlace = focusPlaceId ? byId.get(focusPlaceId) : undefined;
      map = new MapLibreMap({
        container: container.current,
        style: mapStyle,
        center: focusedPlace ? [focusedPlace.lng, focusedPlace.lat] : view === "campus" && places.length === 1 && places[0] ? [places[0].lng, places[0].lat] : view === "campus" ? [-111.6502, 40.2487] : [-111.664, 40.264],
        zoom: focusedPlace ? 16.5 : view === "campus" && places.length === 1 ? 17 : view === "campus" ? 15.3 : 10.2,
        pitch: view === "campus" ? 46 : 0,
        bearing: view === "campus" ? -18 : 0,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: {},
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      if (view === "campus" && container.current) {
        recenterButton = document.createElement("button");
        recenterButton.type = "button";
        recenterButton.className = "absolute left-3 top-3 z-10 rounded-full border border-white/60 bg-[#082e4f]/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-[#123f65]";
        recenterButton.textContent = "⌖ Recenter on BYU";
        recenterButton.addEventListener("click", () => map?.easeTo({ center: [-111.6502, 40.2487], zoom: 15.3, pitch: 46, bearing: -18, duration: 900 }));
        container.current.append(recenterButton);
      }
      if (view === "area") {
        const geolocate = new GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
          fitBoundsOptions: { maxZoom: 14 },
        });
        geolocate.on("geolocate", (event) => {
          onUserLocationRef.current({ lat: event.coords.latitude, lng: event.coords.longitude });
          void logActivityEvent("map_location_enabled", { view });
        });
        map.addControl(geolocate, "top-right");
      }
      const showPlacePopup = (place: MapPlace, coordinates: [number, number]) => {
        if (!map) return;
        mobileCard?.remove();
        mobileCard = undefined;
        const content = document.createElement("div");
        content.className = "map-place-card text-foreground";

        const eyebrow = document.createElement("p");
        eyebrow.className = "text-[11px] font-semibold uppercase tracking-wide text-primary";
        eyebrow.textContent = place.kind === "building" ? (place.code || "BYU building") : place.events.length ? "Free food event" : place.deals.length ? "Student discount" : "Starving Student Card";

        const title = document.createElement("strong");
        title.className = "mt-1 block text-sm leading-snug";
        title.textContent = place.title;

        const directions = document.createElement("div");
        directions.className = "mt-2.5 border-t border-border pt-2.5";
        const directionsLabel = document.createElement("p");
        directionsLabel.className = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
        directionsLabel.textContent = "Get directions";
        const directionsActions = document.createElement("div");
        directionsActions.className = "mt-1 flex gap-1.5";
        const googleMaps = document.createElement("a");
        googleMaps.className = "inline-flex min-h-8 flex-1 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-semibold text-primary-foreground";
        googleMaps.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat}%2C${place.lng}`;
        googleMaps.target = "_blank";
        googleMaps.rel = "noopener noreferrer";
        googleMaps.textContent = "Google Maps ↗";
        googleMaps.addEventListener("click", () => void logActivityEvent("map_directions_opened", { provider: "google", placeId: place.id }));
        const appleMaps = document.createElement("a");
        appleMaps.className = "inline-flex min-h-8 flex-1 items-center justify-center rounded-full border border-border bg-background px-2 text-[11px] font-semibold text-foreground";
        appleMaps.href = `https://maps.apple.com/?daddr=${place.lat}%2C${place.lng}&dirflg=d`;
        appleMaps.target = "_blank";
        appleMaps.rel = "noopener noreferrer";
        appleMaps.textContent = "Apple Maps ↗";
        appleMaps.addEventListener("click", () => void logActivityEvent("map_directions_opened", { provider: "apple", placeId: place.id }));
        directionsActions.append(googleMaps, appleMaps);
        directions.append(directionsLabel, directionsActions);

        const items = document.createElement("div");
        items.className = "mt-3 space-y-2";
        const totalItems = place.cardOffers.length + place.deals.length + place.events.length;
        const previewLimit = isMobileMap() ? 3 : 2;
        let previewCount = 0;
        const appendPreview = (item: HTMLElement) => {
          if (previewCount >= previewLimit) return;
          items.append(item);
          previewCount += 1;
        };

        for (const offer of place.cardOffers) {
          const offerButton = document.createElement("button");
          offerButton.type = "button";
          offerButton.className = "block min-h-12 w-full rounded-xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary";
          offerButton.innerHTML = `<span class="block text-[10px] font-semibold uppercase text-primary">Starving Student offer</span><strong class="mt-0.5 block text-xs leading-snug"></strong><span class="mt-1 block text-[11px] text-muted-foreground"></span>`;
          const strong = offerButton.querySelector("strong");
          const meta = offerButton.querySelector("span:last-child");
          if (strong) strong.textContent = offer.item;
          if (meta) meta.textContent = `${offer.value} · Open offer details →`;
          offerButton.addEventListener("click", () => { void logActivityEvent("map_offer_viewed", { offerId: offer.id, source: "starving_student" }); onOpenOfferRef.current(offer); });
          appendPreview(offerButton);
        }

        for (const deal of place.deals) {
          const dealButton = document.createElement("button");
          dealButton.type = "button";
          dealButton.className = "block min-h-12 w-full rounded-xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary";
          dealButton.innerHTML = `<span class="block text-[10px] font-semibold uppercase text-violet-700">Student discount</span><strong class="mt-0.5 block text-xs leading-snug"></strong><span class="mt-1 block text-[11px] text-muted-foreground"></span>`;
          const strong = dealButton.querySelector("strong");
          const meta = dealButton.querySelector("span:last-child");
          if (strong) strong.textContent = deal.title;
          if (meta) meta.textContent = `${deal.value} · Open discount details →`;
          dealButton.addEventListener("click", () => { void logActivityEvent("map_offer_viewed", { dealId: deal.id, source: "discount" }); onOpenDealRef.current(deal); });
          appendPreview(dealButton);
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
          appendPreview(eventButton);
        }

        if (totalItems > previewCount) {
          const more = document.createElement("button");
          more.type = "button";
          more.className = "block w-full rounded-lg bg-muted px-3 py-2 text-left text-[11px] font-semibold text-primary hover:bg-secondary";
          more.textContent = `View all ${totalItems} items in the full list below ↓`;
          more.addEventListener("click", () => {
            onSelectRef.current(place);
            document.getElementById("map-place-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          items.append(more);
        }

        if (!place.cardOffers.length && !place.deals.length && !place.events.length) {
          const empty = document.createElement("p");
          empty.className = "mt-3 rounded-lg bg-secondary p-2 text-xs text-muted-foreground";
          empty.textContent = "No upcoming free food events at this building.";
          items.append(empty);
        }

        content.append(eyebrow, title, items, directions);
        if (isMobileMap() && container.current) {
          mobileCard = document.createElement("div");
          mobileCard.className = `absolute inset-x-3 bottom-3 z-10 max-h-[76%] overflow-hidden rounded-[1.4rem] border bg-popover p-4 pt-6 pr-11 shadow-float ${view === "campus" ? "border-[#224f75]/25" : "border-border"}`;
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

          const handle = document.createElement("div");
          handle.className = "absolute left-1/2 top-2 h-1 w-11 -translate-x-1/2 rounded-full bg-muted-foreground/25";

          items.className = "mt-2.5 max-h-48 space-y-2 overflow-y-auto overscroll-contain pr-1";
          mobileCard.append(handle, content, close);
          container.current.append(mobileCard);
          mobileCard.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        new Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "290px" })
          .setLngLat(coordinates)
          .setDOMContent(content)
          .addTo(map);
      };
      map.on("load", () => {
        if (!map) return;
        if (view === "campus" && !focusedPlace) {
          const active = places.filter((place) => place.events.length > 0);
          if (active.length === 1 && active[0]) map.easeTo({ center: [active[0].lng, active[0].lat], zoom: 16.2, pitch: 46, bearing: -18 });
          else if (active.length > 1) {
            const bounds = active.reduce((box, place) => box.extend([place.lng, place.lat]), new LngLatBounds());
            map.fitBounds(bounds, { padding: 80, maxZoom: 16.2, pitch: 46, bearing: -18 });
          }
        }
        if (view === "campus") {
          const styleLayers = map.getStyle().layers ?? [];
          for (const layer of styleLayers) {
            try {
              if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#eef2ea");
              if (layer.type === "fill" && /park|landcover|grass|wood/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#cdddc8");
              if (layer.type === "fill" && /water/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#9fc8dc");
              if (layer.type === "line" && /road|street|path/i.test(layer.id)) map.setPaintProperty(layer.id, "line-color", "#f8f4e8");
            } catch { /* Map styles expose different paint properties. */ }
          }

          const vectorSource = Object.entries(map.getStyle().sources ?? {}).find(([, source]) => source.type === "vector")?.[0];
          if (vectorSource && !map.getLayer("campus-3d-buildings")) {
            try {
              const firstLabel = styleLayers.find((layer) => layer.type === "symbol")?.id;
              map.addLayer({
                id: "campus-3d-buildings", type: "fill-extrusion", source: vectorSource, "source-layer": "building", minzoom: 14,
                paint: {
                  "fill-extrusion-color": ["interpolate", ["linear"], ["zoom"], 14, "#d8d4c8", 17, "#f6f1e6"],
                  "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 12],
                  "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                  "fill-extrusion-opacity": 0.88,
                },
              }, firstLabel);
            } catch { /* The fallback map style may not expose building polygons. */ }
          }

          map.addSource("buildings", {
            type: "geojson",
            data: { type: "FeatureCollection", features: places.filter((place) => showInactiveBuildings || place.events.length > 0).map((place) => ({
              id: place.id,
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [place.lng, place.lat] },
              properties: { id: place.id, code: place.code || place.title, name: place.title, eventCount: place.events.length },
            })) },
          });
          map.addLayer({ id: "building-points", type: "circle", source: "buildings", paint: {
            "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#f5b942", [">", ["get", "eventCount"], 0], "#fff3cf", "#ffffff"],
            "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 10, [">", ["get", "eventCount"], 0], 7, 4],
            "circle-stroke-color": ["case", [">", ["get", "eventCount"], 0], "#082e4f", "#58738a"],
            "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 4, [">", ["get", "eventCount"], 0], 2.5, 1],
          } });
          map.addLayer({ id: "building-labels", type: "symbol", source: "buildings", minzoom: 14.5, layout: {
            "text-field": ["step", ["zoom"], ["get", "code"], 17, ["get", "name"]],
            "text-font": ["Roboto Regular", "Noto Sans Regular"],
            "text-size": 12, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true,
          }, paint: { "text-color": "#082e4f", "text-halo-color": "#f8f4e8", "text-halo-width": 2.5 } });
          let selectedBuildingId: string | number | undefined;
          for (const layer of ["building-points", "building-labels"]) {
            map.on("click", layer, (event) => {
              if (map?.queryRenderedFeatures(event.point, { layers: ["place-points"] }).length) return;
              const place = byId.get(event.features?.[0]?.properties?.["id"]);
              if (place) {
                if (selectedBuildingId !== undefined) map?.setFeatureState({ source: "buildings", id: selectedBuildingId }, { selected: false });
                selectedBuildingId = place.id;
                map?.setFeatureState({ source: "buildings", id: place.id }, { selected: true });
                map?.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 16.2), pitch: 52, bearing: -18, duration: 750 });
                void logActivityEvent("map_pin_selected", { placeId: place.id, kind: place.kind, view });
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
              properties: { id: place.id, kind: place.events.length > 0 ? "event" : place.kind, eventCount: place.events.length },
            })),
          },
          cluster: view !== "campus",
          clusterMaxZoom: view === "campus" ? 16 : 13,
          clusterRadius: 42,
        });
        map.addImage("place-card-icon", createMapIcon("card"), { pixelRatio: 2 });
        map.addImage("place-food-icon", createMapIcon("event"), { pixelRatio: 2 });
        map.addImage("place-discount-icon", createMapIcon("discount"), { pixelRatio: 2 });
        map.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"], paint: {
          "circle-color": "#245b4d", "circle-radius": ["step", ["get", "point_count"], 20, 20, 26, 100, 34],
          "circle-stroke-color": "#fff", "circle-stroke-width": 2,
        } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"], layout: {
          "text-field": ["get", "point_count_abbreviated"], "text-size": 13,
        }, paint: { "text-color": "#fff" } });
        map.addLayer({ id: "place-points", type: "circle", source: "places", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": ["match", ["get", "kind"], "event", view === "campus" ? "#d99516" : "#e3a629", "discount", "#7357a4", "#245b4d"],
          "circle-radius": view === "campus" ? 19 : 16, "circle-stroke-color": "#fff", "circle-stroke-width": 2.5,
        } });
        map.addLayer({ id: "place-icons", type: "symbol", source: "places", filter: ["!", ["has", "point_count"]], layout: {
          ...(view === "campus" ? { "text-field": ["to-string", ["get", "eventCount"]], "text-size": 14, "text-font": ["Roboto Bold", "Noto Sans Bold"], "text-allow-overlap": true } : {
            "icon-image": ["match", ["get", "kind"], "event", "place-food-icon", "discount", "place-discount-icon", "place-card-icon"],
            "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true,
          }),
        }, paint: view === "campus" ? { "text-color": "#ffffff" } : {} });
        map.on("click", "place-points", (event) => {
          const id = event.features?.[0]?.properties?.["id"];
          const place = byId.get(id);
          if (place) {
            if (view === "campus") map?.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 16.2), pitch: 52, bearing: -18, duration: 750 });
            void logActivityEvent("map_pin_selected", { placeId: place.id, kind: place.kind, view });
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
        for (const layer of ["clusters", "place-points", "place-icons"]) {
          map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
        }
      });
    });
    return () => { cancelled = true; mobileCard?.remove(); recenterButton?.remove(); map?.remove(); };
  }, [places, view, showInactiveBuildings, focusPlaceId]);

  return <div ref={container} className="relative h-[440px] w-full overflow-hidden rounded-2xl sm:h-[600px]" aria-label={view === "campus" ? "BYU campus events map" : "Area discounts and free food map"} />;
}
