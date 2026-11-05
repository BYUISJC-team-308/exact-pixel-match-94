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
  lat: number;
  lng: number;
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
  latitude: number;
  longitude: number;
};

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
    lat: Number(row.latitude),
    lng: Number(row.longitude),
  };
}

export async function fetchCampusBuildings(): Promise<CampusBuilding[]> {
  const { data, error } = await supabase.from("campus_buildings").select("*").eq("active", true).order("name");
  if (error) {
    console.warn("Campus buildings are using the bundled fallback until the Supabase migration is applied:", error.message);
    return fallbackCampusBuildings;
  }
  return (data as DbCampusBuilding[]).map(normalizeCampusBuilding);
}

export const getMapCampusBuildings = createServerFn({ method: "GET" }).handler(fetchCampusBuildings);

export function useCampusBuildingsQuery() {
  return useQuery({
    queryKey: ["campus_buildings"],
    queryFn: fetchCampusBuildings,
    initialData: fallbackCampusBuildings,
    staleTime: 1000 * 60 * 60,
  });
}
