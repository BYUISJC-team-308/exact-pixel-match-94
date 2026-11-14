import { roomLabel } from "@/lib/student-copy";
import { useEffect, useRef } from "react";
import type { MapPlace } from "@/lib/map-places";
import type { Deal, SSDeal } from "@/lib/data";
import type { NormalizedFoodEvent } from "@/lib/food-events";
import { logActivityEvent } from "@/lib/analytics";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Campus } from "@/lib/campus-buildings";

type Props = {
  places: MapPlace[];
  view: "area" | "campus";
  campus?: Campus;
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

function placeData(places: MapPlace[], include: (place: MapPlace) => boolean) {
  return {
    type: "FeatureCollection" as const,
    features: places.filter(include).map((place) => ({
      id: place.id,
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [place.lng, place.lat] },
      properties: {
        id: place.id, code: place.code || place.title, name: place.title,
        kind: place.events.length ? "event" : place.kind, eventCount: place.events.length,
      },
    })),
  };
}

export function MapCanvas({ places, view, campus, showInactiveBuildings, focusPlaceId, onSelect, onOpenOffer, onOpenEvent, onOpenDeal, onUserLocation }: Props) {
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

  const latest = useRef({ places, showInactiveBuildings, focusPlaceId });
  latest.current = { places, showInactiveBuildings, focusPlaceId };
  const refresh = useRef<((focusChanged: boolean) => void) | null>(null);
  const previousFocus = useRef(focusPlaceId);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let activePopup: import("maplibre-gl").Popup | undefined;
    let recenterButton: HTMLButtonElement | undefined;
    const resizeObserver = new ResizeObserver(() => {
      map?.resize();
      if (window.matchMedia("(max-width: 1279px)").matches) activePopup?.remove();
    });
    resizeObserver.observe(container.current);
    const findPlace = (id: unknown) => latest.current.places.find((place) => place.id === id);

    void import("maplibre-gl").then(({ GeolocateControl, LngLatBounds, Map: MapLibreMap, NavigationControl, Popup, setWorkerUrl }) => {
      if (cancelled || !container.current) return;
      setWorkerUrl(workerUrl);
      const { places, focusPlaceId } = latest.current;
      const focusedPlace = findPlace(focusPlaceId);
      map = new MapLibreMap({
        container: container.current,
        style: mapStyle,
        center: focusedPlace ? [focusedPlace.lng, focusedPlace.lat] : view === "campus" && places.length === 1 && places[0] ? [places[0].lng, places[0].lat] : view === "campus" ? [campus?.lng ?? -111.6502, campus?.lat ?? 40.2487] : [-111.664, 40.264],
        zoom: focusedPlace ? 16.5 : view === "campus" && places.length === 1 ? 17 : view === "campus" ? (campus?.zoom ?? 15.3) : 10.2,
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
        recenterButton.style.backgroundColor = campus?.primaryColor || "#082e4f";
        recenterButton.textContent = `⌖ Recenter on ${campus?.shortName || "campus"}`;
        recenterButton.addEventListener("click", () => map?.easeTo({ center: [campus?.lng ?? -111.6502, campus?.lat ?? 40.2487], zoom: campus?.zoom ?? 15.3, pitch: 46, bearing: -18, duration: 900 }));
        container.current.append(recenterButton);
      }
      if (view === "area" || view === "campus") {
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
        // Use the page's scrollable details sheet instead of overlapping popups on phones/tablets.
        if (window.matchMedia("(max-width: 1279px)").matches) return;
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
        const previewLimit = 2;
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
          eventMeta.textContent = `${event.food} · ${event.formattedDate}, ${event.formattedTime}${event.room ? ` · ${roomLabel(event.room)}` : ""} · Open event details →`;
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
        activePopup?.remove();
        activePopup = new Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "290px" })
          .setLngLat(coordinates)
          .setDOMContent(content)
          .addTo(map);
      };
      let selectedBuildingId: string | number | undefined;
      map.on("load", () => {
        if (!map || cancelled) return;
        const { places, showInactiveBuildings, focusPlaceId } = latest.current;
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

          // Use the provider's actual building source only after TileJSON supplied tiles.
          const vectorSource = styleLayers.find((layer) =>
            "source-layer" in layer && layer["source-layer"] === "building" &&
            "source" in layer && typeof layer.source === "string" &&
            Boolean((map?.getSource(layer.source) as import("maplibre-gl").VectorTileSource | undefined)?.tiles?.length)
          );
          const buildingSource = vectorSource && "source" in vectorSource ? vectorSource.source : undefined;
          if (typeof buildingSource === "string" && !map.getLayer("campus-3d-buildings")) {
            try {
              const firstLabel = styleLayers.find((layer) => layer.type === "symbol")?.id;
              map.addLayer({
                id: "campus-3d-buildings", type: "fill-extrusion", source: buildingSource, "source-layer": "building", minzoom: 14,
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
            data: placeData(places, (place) => showInactiveBuildings || place.events.length > 0 || place.id === focusPlaceId),
          });
          map.addLayer({ id: "building-points", type: "circle", source: "buildings", paint: {
            "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#f5b942", [">", ["get", "eventCount"], 0], "#fff3cf", "#ffffff"],
            "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 10, [">", ["get", "eventCount"], 0], 7, 4],
            "circle-stroke-color": ["case", [">", ["get", "eventCount"], 0], campus?.primaryColor || "#082e4f", "#58738a"],
            "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 4, [">", ["get", "eventCount"], 0], 2.5, 1],
          } });
          map.addLayer({ id: "building-labels", type: "symbol", source: "buildings", minzoom: 14.5, layout: {
            "text-field": ["step", ["zoom"], ["get", "code"], 17, ["get", "name"]],
            "text-font": ["Roboto Regular", "Noto Sans Regular"],
            "text-size": 12, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true,
          }, paint: { "text-color": campus?.primaryColor || "#082e4f", "text-halo-color": campus?.secondaryColor || "#f8f4e8", "text-halo-width": 2.5 } });
          if (focusedPlace) {
            selectedBuildingId = focusedPlace.id;
            map?.setFeatureState({ source: "buildings", id: focusedPlace.id }, { selected: true });
            showPlacePopup(focusedPlace, [focusedPlace.lng, focusedPlace.lat]);
          }
          for (const layer of ["building-points", "building-labels"]) {
            map.on("click", layer, (event) => {
              if (map?.queryRenderedFeatures(event.point, { layers: ["place-points"] }).length) return;
              const place = findPlace(event.features?.[0]?.properties?.["id"]);
              if (place) {
                if (selectedBuildingId !== undefined) map?.setFeatureState({ source: "buildings", id: selectedBuildingId }, { selected: false });
                selectedBuildingId = place.id;
                map?.setFeatureState({ source: "buildings", id: place.id }, { selected: true });
                map?.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 16.2), pitch: 52, bearing: -18, duration: 750 });
                void logActivityEvent("map_pin_selected", { placeId: place.id, kind: place.kind, view });
                onSelectRef.current(place);
                showPlacePopup(place, [place.lng, place.lat]);
              }
            });
            map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
          }
        }
        map.addSource("places", {
          type: "geojson",
          data: placeData(places, (place) => view !== "campus" || place.events.length > 0 || place.id === focusPlaceId),
          cluster: view !== "campus",
          clusterMaxZoom: view === "campus" ? 16 : 13,
          clusterRadius: 42,
        });
        map.addImage("place-card-icon", createMapIcon("card"), { pixelRatio: 2 });
        map.addImage("place-food-icon", createMapIcon("event"), { pixelRatio: 2 });
        map.addImage("place-discount-icon", createMapIcon("discount"), { pixelRatio: 2 });
        map.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"], paint: {
          "circle-color": "#245b4d", "circle-opacity": 0.94, "circle-radius": ["step", ["get", "point_count"], 20, 20, 26, 100, 34],
          "circle-stroke-color": "#fff", "circle-stroke-width": 3,
        } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"], layout: {
          "text-field": ["get", "point_count_abbreviated"], "text-size": 13,
        }, paint: { "text-color": "#fff" } });
        map.addLayer({ id: "selected-place-halo", type: "circle", source: "places", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], focusPlaceId || "__none__"]], paint: {
          "circle-color": "#ffffff", "circle-radius": view === "campus" ? 27 : 24,
          "circle-opacity": 0.92, "circle-stroke-color": campus?.primaryColor || "#245b4d", "circle-stroke-width": 3,
        } });
        map.addLayer({ id: "place-points", type: "circle", source: "places", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": ["match", ["get", "kind"], "event", view === "campus" ? "#d99516" : "#e3a629", "discount", "#7357a4", campus?.primaryColor || "#245b4d"],
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
          const place = findPlace(id);
          if (place) {
            if (view === "campus") map?.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 16.2), pitch: 52, bearing: -18, duration: 750 });
            void logActivityEvent("map_pin_selected", { placeId: place.id, kind: place.kind, view });
            onSelectRef.current(place);
            showPlacePopup(place, [place.lng, place.lat]);
          }
        });
        map.on("click", "clusters", async (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const source = map?.getSource("places") as import("maplibre-gl").GeoJSONSource | undefined;
          if (!source) return;
          try {
            const zoom = await source.getClusterExpansionZoom(feature.properties?.["cluster_id"]);
            if (!cancelled) map?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
          } catch (error) {
            // A filter can replace the cluster index while its expansion is pending.
            if (!cancelled && latest.current.places === places) console.warn("Could not expand map cluster", error);
          }
        });
        for (const layer of ["clusters", "place-points", "place-icons"]) {
          map.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
        }
        refresh.current = (focusChanged) => {
          if (!map || cancelled) return;
          const current = latest.current;
          const placesSource = map.getSource<import("maplibre-gl").GeoJSONSource>("places");
          const buildingsSource = map.getSource<import("maplibre-gl").GeoJSONSource>("buildings");
          const dataChanged = current.places !== renderedPlaces || current.showInactiveBuildings !== renderedInactive;
          if (dataChanged || focusChanged) {
            activePopup?.remove();
            placesSource?.setData(placeData(current.places, (place) => view !== "campus" || place.events.length > 0 || place.id === current.focusPlaceId));
            buildingsSource?.setData(placeData(current.places, (place) => current.showInactiveBuildings || place.events.length > 0 || place.id === current.focusPlaceId));
            renderedPlaces = current.places;
            renderedInactive = current.showInactiveBuildings;
          }
          map.setFilter("selected-place-halo", ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], current.focusPlaceId || "__none__"]]);
          const focused = focusChanged && findPlace(current.focusPlaceId);
          if (focused) {
            if (selectedBuildingId !== undefined) map?.setFeatureState({ source: "buildings", id: selectedBuildingId }, { selected: false });
            selectedBuildingId = focused.id;
            map?.setFeatureState({ source: "buildings", id: focused.id }, { selected: true });
            map.easeTo({ center: [focused.lng, focused.lat], zoom: Math.max(map.getZoom(), 16.2), duration: 500 });
            showPlacePopup(focused, [focused.lng, focused.lat]);
          }
        };
        let renderedPlaces = places;
        let renderedInactive = showInactiveBuildings;
      });
    });
    return () => {
      cancelled = true;
      refresh.current = null;
      resizeObserver.disconnect();
      recenterButton?.remove();
      map?.remove();
    };
  }, [view, campus]);

  useEffect(() => {
    refresh.current?.(previousFocus.current !== focusPlaceId);
    previousFocus.current = focusPlaceId;
  }, [places, showInactiveBuildings, focusPlaceId]);

  return <div ref={container} className="relative h-[60svh] min-h-[280px] max-h-[640px] w-full overflow-hidden rounded-[1.6rem] sm:h-[640px] xl:h-[calc(100dvh-6rem)] xl:max-h-[820px]" aria-label={view === "campus" ? `${campus?.shortName || "College"} campus events map` : "Area discounts and free food map"} />;
}
