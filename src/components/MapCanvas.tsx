import { useEffect, useRef } from "react";
import type { MapPlace } from "@/lib/map-places";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

type Props = {
  places: MapPlace[];
  view: "area" | "campus";
  onSelect: (place: MapPlace) => void;
};

const mapTilerKey = import.meta.env["VITE_MAPTILER_KEY"];
const mapStyle = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : "https://tiles.openfreemap.org/styles/liberty";

export function MapCanvas({ places, view, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    const byId = new Map(places.map((place) => [place.id, place]));

    void import("maplibre-gl").then(({ Map: MapLibreMap, NavigationControl, setWorkerUrl }) => {
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
              const place = byId.get(event.features?.[0]?.properties?.["id"]);
              if (place) onSelectRef.current(place);
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
          if (place) onSelectRef.current(place);
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
    return () => { cancelled = true; map?.remove(); };
  }, [places, view]);

  return <div ref={container} className="h-[440px] w-full rounded-2xl sm:h-[600px]" aria-label={view === "campus" ? "BYU campus events map" : "Area discounts and free food map"} />;
}
