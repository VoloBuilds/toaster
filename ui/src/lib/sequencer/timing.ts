/**
 * Strudel Scheduler Timing Constants
 * 
 * These values are derived from Strudel's source code to ensure
 * our sequencer stays perfectly in sync with Strudel's audio output.
 * 
 * Source: node_modules/@strudel/core/cyclist.mjs:17
 * 
 * Strudel's scheduler adds this latency to the targetTime of every
 * sound it schedules. Our sequencer must use the same latency to
 * play sounds at exactly the same time.
 */

/** Strudel's scheduler latency in seconds */
export const STRUDEL_LATENCY_S = 0.1

/** Strudel's scheduler latency in milliseconds */
export const STRUDEL_LATENCY_MS = 100

