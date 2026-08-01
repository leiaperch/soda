/**
 * Track dimensions, in their own module so props, chunks and pickups can all
 * read them without importing each other in a cycle.
 */

export const LANE_X = [-2.6, 0, 2.6];

/**
 * Altitudes for flight zones. The same three-slot grammar as the lanes, one
 * axis up: swipe left and right for lane, up and down for altitude, so a
 * sealed tube becomes a 3x3 grid without teaching a single new control.
 */
export const ALT_Y = [0.4, 2.2, 4.0];
export const ROAD_HALF = 5.6;
export const CHUNK_LEN = 48;

/** Height of a grind rail's top surface. Above a barrier's 1.05 on purpose, so
 *  a grinding player clears barriers for free. That is the point of grinding. */
export const RAIL_H = 1.25;

export const OBSTACLE = {
  barrier: { w: 2.3, h: 1.05, d: 0.7, base: 0 },      // jump it
  gate:    { w: 2.4, h: 2.2, d: 0.7, base: 1.35 },    // slide under it
  block:   { w: 2.3, h: 3.6, d: 1.0, base: 0 },       // change lane
  // Spans every lane and is taller than a normal jump apex. There is no way
  // around or over it except off a bloom pad, which is the entire point.
  hedge:   { w: 2.62, h: 3.2, d: 2.2, base: 0 },
  // Hitting one is not a crash: it throws you sideways and pays out. Tall
  // enough that jumping it is not the answer.
  bumper:  { w: 2.2, h: 2.6, d: 1.6, base: 0 },
};
