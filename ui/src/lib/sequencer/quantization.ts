import { SequencerNote, QuantizeValue } from './types'

/**
 * Get the number of subdivisions per cycle for a given quantize value
 */
export const getSubdivisionsPerCycle = (quantizeValue: QuantizeValue): number => {
  switch (quantizeValue) {
    case '1/4': return 4
    case '1/8': return 8
    case '1/16': return 16
    case '1/32': return 32
    case '1/4T': return 6    // Triplet quarter notes (3 per beat × 2 beats for half cycle)
    case '1/8T': return 12   // Triplet eighth notes
    case '1/16T': return 24  // Triplet sixteenth notes
    case '1/32T': return 48  // Triplet thirty-second notes
    default: return 8
  }
}

/**
 * Snap a time value to the nearest grid slot
 * @param timeMs - Time in milliseconds
 * @param slotDurationMs - Duration of each slot in milliseconds
 * @returns Snapped time in milliseconds
 */
const snapToGrid = (timeMs: number, slotDurationMs: number): number => {
  return Math.round(timeMs / slotDurationMs) * slotDurationMs
}

/**
 * Quantize notes to the specified grid resolution
 * @param notes - Array of sequencer notes
 * @param cycleDurationMs - Duration of one cycle in milliseconds
 * @param quantizeValue - Quantization resolution
 * @returns New array of quantized notes (original notes are not modified)
 */
export const quantizeNotes = (
  notes: SequencerNote[],
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): SequencerNote[] => {
  const subdivisions = getSubdivisionsPerCycle(quantizeValue)
  const slotDurationMs = cycleDurationMs / subdivisions
  
  return notes.map(note => {
    // Snap start time to nearest slot
    const quantizedStart = snapToGrid(note.startMs, slotDurationMs)
    
    // Snap end time to nearest slot
    let quantizedEnd = snapToGrid(note.endMs, slotDurationMs)
    
    // Ensure minimum duration of 1 slot
    if (quantizedEnd <= quantizedStart) {
      quantizedEnd = quantizedStart + slotDurationMs
    }
    
    return {
      ...note,
      startMs: quantizedStart,
      endMs: quantizedEnd
    }
  })
}

/**
 * Get the slot index for a given time
 * @param timeMs - Time in milliseconds
 * @param cycleDurationMs - Duration of one cycle in milliseconds
 * @param quantizeValue - Quantization resolution
 * @returns Slot index (may exceed cycle boundaries)
 */
export const getSlotIndex = (
  timeMs: number,
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): number => {
  const subdivisions = getSubdivisionsPerCycle(quantizeValue)
  const slotDurationMs = cycleDurationMs / subdivisions
  return Math.floor(timeMs / slotDurationMs)
}

/**
 * Get the cycle index for a given time
 * @param timeMs - Time in milliseconds
 * @param cycleDurationMs - Duration of one cycle in milliseconds
 * @returns Cycle index (0-based)
 */
export const getCycleIndex = (timeMs: number, cycleDurationMs: number): number => {
  return Math.floor(timeMs / cycleDurationMs)
}

