import { SequencerNote, QuantizeValue, BASE_SLOTS_PER_CYCLE } from './types'

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
 * Get the number of base slots per subdivision for a given quantize value.
 * This is how many of the 96 base slots make up one quantize unit.
 */
export const getSlotsPerSubdivision = (quantizeValue: QuantizeValue): number => {
  const subdivisions = getSubdivisionsPerCycle(quantizeValue)
  return BASE_SLOTS_PER_CYCLE / subdivisions
}

/**
 * Convert slot index to milliseconds.
 * Only used at rendering/audio boundaries.
 */
export const slotToMs = (slot: number, cycleDurationMs: number): number => {
  return (slot / BASE_SLOTS_PER_CYCLE) * cycleDurationMs
}

/**
 * Convert milliseconds to slot index.
 * Rounds to nearest slot. Used for mouse input conversion.
 */
export const msToSlot = (ms: number, cycleDurationMs: number): number => {
  return Math.round((ms / cycleDurationMs) * BASE_SLOTS_PER_CYCLE)
}

/**
 * Snap a slot to the nearest grid position for a given quantize value.
 * Uses pure integer math to eliminate floating-point drift.
 */
export const snapSlotToGrid = (slot: number, quantizeValue: QuantizeValue): number => {
  const slotsPerSubdivision = getSlotsPerSubdivision(quantizeValue)
  return Math.round(slot / slotsPerSubdivision) * slotsPerSubdivision
}

/**
 * Floor-snap a slot to the grid (for determining note start positions).
 */
export const floorSlotToGrid = (slot: number, quantizeValue: QuantizeValue): number => {
  const slotsPerSubdivision = getSlotsPerSubdivision(quantizeValue)
  return Math.floor(slot / slotsPerSubdivision) * slotsPerSubdivision
}

/**
 * Quantize notes to the specified grid resolution.
 * Notes are already in slot units, so this snaps to the grid.
 * @param notes - Array of sequencer notes (slot-based)
 * @param quantizeValue - Quantization resolution
 * @returns New array of quantized notes (original notes are not modified)
 */
export const quantizeNotes = (
  notes: SequencerNote[],
  quantizeValue: QuantizeValue
): SequencerNote[] => {
  const slotsPerSubdivision = getSlotsPerSubdivision(quantizeValue)
  
  return notes.map(note => {
    // Snap start slot to nearest grid position
    const quantizedStart = snapSlotToGrid(note.startSlot, quantizeValue)
    
    // Snap end slot to nearest grid position
    let quantizedEnd = snapSlotToGrid(note.endSlot, quantizeValue)
    
    // Ensure minimum duration of 1 subdivision
    if (quantizedEnd <= quantizedStart) {
      quantizedEnd = quantizedStart + slotsPerSubdivision
    }
    
    return {
      ...note,
      startSlot: quantizedStart,
      endSlot: quantizedEnd
    }
  })
}

/**
 * Get the quantize-grid slot index for a given base slot.
 * @param slot - Base slot index (0-95 per cycle)
 * @param quantizeValue - Quantization resolution
 * @returns Quantize-grid slot index
 */
export const getQuantizeSlotIndex = (
  slot: number,
  quantizeValue: QuantizeValue
): number => {
  const slotsPerSubdivision = getSlotsPerSubdivision(quantizeValue)
  return Math.floor(slot / slotsPerSubdivision)
}

/**
 * Get the cycle index for a given slot.
 * @param slot - Base slot index
 * @returns Cycle index (0-based)
 */
export const getCycleIndexFromSlot = (slot: number): number => {
  return Math.floor(slot / BASE_SLOTS_PER_CYCLE)
}

