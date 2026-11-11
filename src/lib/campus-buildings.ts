import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import buildingRecords from "@/lib/byu-buildings.json";
import { supabase } from "@/lib/supabase";

export type CampusBuilding = {
  id: string;
  sourceKey: string;
  code: string;
  name: string;
  officialName: string;
  aliases: string[];
  address: string;
  use: string;
  campusId?: string;
  lat: number | null;
  lng: number | null;
};

export type Campus = {
  id: string;
  slug: string;
  name: string;
  collegeName: string;
  shortName: string;
  city: string;
  lat: number;
  lng: number;
  zoom: number;
  primaryColor: string;
  secondaryColor: string;
  mapUrl: string;
};

export type DbCampusBuilding = {
  id: string;
  source_key: string;
  code: string | null;
  name: string;
  official_name: string | null;
  aliases: string[] | null;
  address: string | null;
  building_use: string | null;
  latitude: number | null;
  longitude: number | null;
  campus_id?: string | null;
};

type DbCampus = {
  id: string; slug: string; name: string; city: string; latitude: number; longitude: number;
  default_zoom: number; map_url: string | null;
  colleges: { name: string; short_name: string; primary_color: string; secondary_color: string } | null;
};

export const fallbackCampuses: Campus[] = [{
  id: "eb801cfa-9f8f-43f5-89e0-6d056b4edcc4", slug: "byu-provo", name: "BYU Provo", collegeName: "Brigham Young University",
  shortName: "BYU", city: "Provo", lat: 40.2487, lng: -111.6502, zoom: 15.3,
  primaryColor: "#082e4f", secondaryColor: "#f8f4e8", mapUrl: "https://map.byu.edu/",
}];

export const fallbackCampusBuildings: CampusBuilding[] = buildingRecords
  .filter((building) => Number.isFinite(building.lat) && Number.isFinite(building.lng))
  .map((building, index) => ({
    id: `fallback-${building.code.trim() || "building"}-${index}`,
    sourceKey: `${building.code.trim() || "building"}-${index}`,
    code: building.code.trim(),
    name: building.label?.trim() || building.name.trim(),
    officialName: building.name.trim(),
    aliases: [building.name.trim().toLowerCase(), building.label?.trim().toLowerCase()].filter(Boolean) as string[],
    address: building.address?.trim() || "",
    use: building.use?.trim() || "",
    campusId: "eb801cfa-9f8f-43f5-89e0-6d056b4edcc4",
    lat: building.lat,
    lng: building.lng,
  }));

export function normalizeCampusBuilding(row: DbCampusBuilding): CampusBuilding {
  return {
    id: row.id,
    sourceKey: row.source_key,
    code: row.code?.trim() || "",
    name: row.name.trim(),
    officialName: row.official_name?.trim() || row.name.trim(),
    aliases: (row.aliases || []).map((alias) => alias.trim().toLowerCase()).filter(Boolean),
    address: row.address?.trim() || "",
    use: row.building_use?.trim() || "",
    campusId: row.campus_id || undefined,
    lat: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
    lng: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
  };
}

function normalizeCampus(row: DbCampus): Campus {
  const college = row.colleges;
  return { id: row.id, slug: row.slug, name: row.name, collegeName: college?.name || row.name,
    shortName: college?.short_name || row.name, city: row.city, lat: Number(row.latitude), lng: Number(row.longitude),
    zoom: Number(row.default_zoom), primaryColor: college?.primary_color || "#163f33",
    secondaryColor: college?.secondary_color || "#ffffff", mapUrl: row.map_url || "" };
}

export async function fetchCampusBuildings(): Promise<CampusBuilding[]> {
  const { data, error } = await supabase.from("campus_buildings").select("*").eq("active", true).order("name");
  if (error) {
    console.warn("Campus buildings are using the bundled fallback until the Supabase migration is applied:", error.message);
    return fallbackCampusBuildings;
  }
  return (data as DbCampusBuilding[]).map(normalizeCampusBuilding);
}

export async function fetchCampuses(): Promise<Campus[]> {
  const { data, error } = await supabase.from("campuses").select("*, colleges(name, short_name, primary_color, secondary_color)").eq("active", true).order("name");
  if (error) return fallbackCampuses;
  return (data as unknown as DbCampus[]).map(normalizeCampus);
}

export const getMapCampusBuildings = createServerFn({ method: "GET" }).handler(fetchCampusBuildings);
export const getMapCampuses = createServerFn({ method: "GET" }).handler(fetchCampuses);

export function useCampusBuildingsQuery() {
  return useQuery({
    queryKey: ["campus_buildings"],
    queryFn: fetchCampusBuildings,
    placeholderData: fallbackCampusBuildings,
    staleTime: 1000 * 60 * 60,
  });
}

export function useCampusesQuery() {
  return useQuery({
    queryKey: ["campuses"],
    queryFn: fetchCampuses,
    placeholderData: fallbackCampuses,
    staleTime: 1000 * 60 * 60,
  });
}
