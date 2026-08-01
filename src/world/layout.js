/**
 * Track dimensions, in their own module so props, chunks and pickups can all
 * read them without importing each other in a cycle.
 */

export const LANE_X = [-2.6, 0, 2.6];
export const ROAD_HALF = 5.6;
export const CHUNK_LEN = 48;

/** Height of a grind rail's top surface. Above a barrier's 1.05 on purpose, so
 *  a grinding player clears barriers for free. That is the point of grinding. */
export const RAIL_H = 1.25;

export const OBSTACLE = {
  barrier: { w: 2.3, h: 1.05, d: 0.7, base: 0 },      // jump it
  gate:    { w: 2.4, h: 2.2, d: 0.7, base: 1.35 },    // slide under it
  block:   { w: 2.3, h: 3.6, d: 1.0, base: 0 },       // change lane
};
