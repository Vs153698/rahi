import { z } from 'zod';

/**
 * Route + turn-instruction contract shared by the API (which computes routes via
 * GraphHopper) and the app (which caches them for offline voice nav —
 * rahi-docs/07 §3, /04 routes.instructions). The parser is pure so the same code
 * shapes the route on the server and can be re-validated on the device.
 */
export const RouteInstructionSchema = z.object({
  text: z.string(),
  distanceM: z.number(),
  timeMs: z.number(),
  /** GraphHopper turn sign (-3..6); 0 = continue, 2 = right, -2 = left, 4 = finish. */
  sign: z.number(),
});
export type RouteInstruction = z.infer<typeof RouteInstructionSchema>;

export const ComputedRouteSchema = z.object({
  /** [lng, lat] pairs (GeoJSON order). */
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  distanceKm: z.number(),
  instructions: z.array(RouteInstructionSchema),
});
export type ComputedRoute = z.infer<typeof ComputedRouteSchema>;

/** Minimal shape of a GraphHopper `paths[i]` entry (points_encoded=false). */
export interface GraphHopperPath {
  distance: number; // meters
  time: number; // ms
  points: { type: 'LineString'; coordinates: [number, number][] };
  instructions: { text: string; distance: number; time: number; sign: number; interval: [number, number] }[];
}

/**
 * Pure parser: GraphHopper path -> our ComputedRoute. Requires the request to use
 * `points_encoded=false` so coordinates arrive as GeoJSON (no polyline decode).
 */
export function parseGraphHopperPath(path: GraphHopperPath): ComputedRoute {
  return {
    coordinates: path.points.coordinates,
    distanceKm: Math.round((path.distance / 1000) * 100) / 100,
    instructions: path.instructions.map((i) => ({
      text: i.text,
      distanceM: i.distance,
      timeMs: i.time,
      sign: i.sign,
    })),
  };
}
