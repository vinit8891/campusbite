/**
 * GPS Campus and Outside Hub Zone Detection with Haversine distance calculations.
 */

export type ZoneCategory = "HOSTEL" | "OUTSIDE";

export interface CampusZone {
  id: string;
  name: string;
  category: ZoneCategory;
  lat: number;
  lng: number;
  description?: string;
}

export const KNOWN_CAMPUS_ZONES: CampusZone[] = [
  {
    id: "block_a",
    name: "Hostel Block A",
    category: "HOSTEL",
    lat: 18.52043,
    lng: 73.85674,
    description: "North Campus Boys Hostel",
  },
  {
    id: "block_b",
    name: "Hostel Block B",
    category: "HOSTEL",
    lat: 18.5211,
    lng: 73.8572,
    description: "East Campus Boys Hostel",
  },
  {
    id: "block_c",
    name: "Hostel Block C",
    category: "HOSTEL",
    lat: 18.522,
    lng: 73.858,
    description: "Girls Hostel Complex",
  },
  {
    id: "library_gate",
    name: "Library / Main Gate",
    category: "HOSTEL",
    lat: 18.5195,
    lng: 73.8559,
    description: "Central Library & Main Campus Entrance",
  },
  {
    id: "college_road",
    name: "College Road",
    category: "OUTSIDE",
    lat: 18.5235,
    lng: 73.8592,
    description: "College Road Student PG Hub",
  },
  {
    id: "back_gate",
    name: "Back Gate Area",
    category: "OUTSIDE",
    lat: 18.518,
    lng: 73.854,
    description: "South Back Gate & Flat Societies",
  },
  {
    id: "main_road",
    name: "Main Road",
    category: "OUTSIDE",
    lat: 18.525,
    lng: 73.861,
    description: "Main Road Market & PG Cluster",
  },
];

/**
 * Calculates distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (loc1.lat * Math.PI) / 180;
  const phi2 = (loc2.lat * Math.PI) / 180;
  const deltaPhi = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLambda = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds the nearest campus or outside zone to the given coordinates.
 */
export function findClosestZone(userLoc: { lat: number; lng: number }): {
  zone: CampusZone;
  distanceMeters: number;
} {
  let closestZone = KNOWN_CAMPUS_ZONES[0];
  let minDistance = Infinity;

  for (const zone of KNOWN_CAMPUS_ZONES) {
    const dist = calculateDistanceMeters(userLoc, { lat: zone.lat, lng: zone.lng });
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone;
    }
  }

  return {
    zone: closestZone,
    distanceMeters: Math.round(minDistance),
  };
}
