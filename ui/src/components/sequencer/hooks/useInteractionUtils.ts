import { useCallback } from 'react'
import {
  SequencerNote,
  SequencerMode,
  QuantizeValue,
  CycleInfo,
  DRUM_SOUNDS,
  DEFAULT_CYCLE_DURATION_MS,
  PIANO_MIDI_MIN,
  PIANO_MIDI_MAX,
  BASE_SLOTS_PER_CYCLE
} from '../../../lib/sequencer/types'
import { getSlotsPerSubdivision, msToSlot, floorSlotToGrid, snapSlotToGrid } from '../../../lib/sequencer/quantization'
import { DrawingState } from './useGridRenderer'

// Shared options for interaction utilities
export interface InteractionUtilsOptions {
  mode: SequencerMode
  midiOffset: number
  quantizeValue: QuantizeValue
  pixelsPerMs: number
  laneHeight: number
  getCycleInfo: () => CycleInfo | null
  xToTimeMs: (x: number) => number
  yToRow: (y: number) => number
}

// Return type for the hook
export interface InteractionUtilsReturn {
  // Quantization helpers
  getSlotDurationMs: () => number  // Still needed for pixel calculations
  getSlotsPerSubdiv: () => number  // How many base slots per quantize unit
  snapToSlot: (slot: number) => number  // Snap a slot to grid
  getTapThreshold: () => number
  
  // Drawing helpers
  getDrawingStateForPosition: (pos: { x: number; y: number }) => DrawingState | null
  
  // Note creation helpers
  createNoteFromDrawingState: (
    drawingState: DrawingState,
    createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  ) => void
  
  // Note movement helpers - now works in slot space
  calculateMoveDelta: (
    startPos: { x: number; y: number },
    currentPos: { x: number; y: number }
  ) => { deltaSlots: number; deltaRow: number }
  
  applyMoveToNote: (
    note: SequencerNote,
    deltaSlots: number,
    deltaRow: number
  ) => Partial<Omit<SequencerNote, 'id'>>
  
  // Resize helpers - now works in slot space
  calculateResizeStart: (
    originalNote: SequencerNote,
    deltaSlots: number
  ) => number
  
  calculateResizeEnd: (
    originalNote: SequencerNote,
    deltaSlots: number
  ) => number
  
  // Validation
  isValidRow: (row: number) => boolean
}

export const useInteractionUtils = ({
  mode,
  midiOffset,
  quantizeValue,
  pixelsPerMs,
  laneHeight,
  getCycleInfo,
  xToTimeMs,
  yToRow
}: InteractionUtilsOptions): InteractionUtilsReturn => {
  
  // Get the duration of one quantize slot in ms (for pixel calculations)
  const getSlotDurationMs = useCallback(() => {
    const cycleInfo = getCycleInfo()
    const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    const slotsPerSubdiv = getSlotsPerSubdivision(quantizeValue)
    // Each subdivision is slotsPerSubdiv base slots
    // So slotDurationMs = cycleDurationMs / BASE_SLOTS_PER_CYCLE * slotsPerSubdiv
    return (cycleDurationMs / BASE_SLOTS_PER_CYCLE) * slotsPerSubdiv
  }, [getCycleInfo, quantizeValue])
  
  // Get how many base slots per quantize subdivision
  const getSlotsPerSubdiv = useCallback(() => {
    return getSlotsPerSubdivision(quantizeValue)
  }, [quantizeValue])
  
  // Snap a base slot to the grid
  const snapToSlot = useCallback((slot: number) => {
    return snapSlotToGrid(slot, quantizeValue)
  }, [quantizeValue])
  
  // Calculate tap threshold (50% of one quantize slot width in pixels)
  const getTapThreshold = useCallback(() => {
    const slotDurationMs = getSlotDurationMs()
    const slotWidthPx = slotDurationMs * pixelsPerMs
    return slotWidthPx * 0.5
  }, [getSlotDurationMs, pixelsPerMs])
  
  // Check if a row is valid for the current mode
  const isValidRow = useCallback((row: number) => {
    if (mode === 'drum') {
      return row >= 0 && row < DRUM_SOUNDS.length
    } else {
      const midi = midiOffset + row
      return midi >= PIANO_MIDI_MIN && midi <= PIANO_MIDI_MAX
    }
  }, [mode, midiOffset])
  
  // Get drawing state for a position (used to start drawing)
  // Returns slot-based DrawingState
  const getDrawingStateForPosition = useCallback((pos: { x: number; y: number }): DrawingState | null => {
    const cycleInfo = getCycleInfo()
    const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    const slotsPerSubdiv = getSlotsPerSubdivision(quantizeValue)
    
    const rawTimeMs = xToTimeMs(pos.x)
    const rawSlot = msToSlot(rawTimeMs, cycleDurationMs)
    const startSlot = floorSlotToGrid(Math.max(0, rawSlot), quantizeValue)
    const row = yToRow(pos.y)
    
    if (!isValidRow(row)) return null
    
    return {
      row,
      startSlot: startSlot,
      currentEndSlot: startSlot + slotsPerSubdiv
    }
  }, [getCycleInfo, quantizeValue, xToTimeMs, yToRow, isValidRow])
  
  // Create a note from drawing state
  const createNoteFromDrawingState = useCallback((
    drawingState: DrawingState,
    createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  ) => {
    if (mode === 'drum') {
      const drumSound = DRUM_SOUNDS[drawingState.row]?.key
      if (drumSound) {
        createNote({
          type: 'drum',
          drumSound,
          startSlot: drawingState.startSlot,
          endSlot: drawingState.currentEndSlot
        })
      }
    } else {
      const midi = midiOffset + drawingState.row
      if (midi >= PIANO_MIDI_MIN && midi <= PIANO_MIDI_MAX) {
        createNote({
          type: 'notes',
          midi,
          startSlot: drawingState.startSlot,
          endSlot: drawingState.currentEndSlot
        })
      }
    }
  }, [mode, midiOffset])
  
  // Calculate delta for note movement - now returns slot delta
  const calculateMoveDelta = useCallback((
    startPos: { x: number; y: number },
    currentPos: { x: number; y: number }
  ) => {
    const cycleInfo = getCycleInfo()
    const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    
    const deltaX = currentPos.x - startPos.x
    const deltaY = currentPos.y - startPos.y
    const deltaMs = deltaX / pixelsPerMs
    // Convert ms delta to slot delta
    const deltaSlots = Math.round((deltaMs / cycleDurationMs) * BASE_SLOTS_PER_CYCLE)
    const deltaRow = -Math.round(deltaY / laneHeight)
    return { deltaSlots, deltaRow }
  }, [pixelsPerMs, laneHeight, getCycleInfo])
  
  // Apply movement delta to a note (now works in slot space)
  const applyMoveToNote = useCallback((
    note: SequencerNote,
    deltaSlots: number,
    deltaRow: number
  ): Partial<Omit<SequencerNote, 'id'>> => {
    const rawNewStart = note.startSlot + deltaSlots
    const newStartSlot = snapSlotToGrid(Math.max(0, rawNewStart), quantizeValue)
    const duration = note.endSlot - note.startSlot
    
    if (mode === 'notes' && note.midi !== undefined) {
      const newMidi = Math.max(PIANO_MIDI_MIN, Math.min(PIANO_MIDI_MAX - 1, note.midi + deltaRow))
      return {
        startSlot: newStartSlot,
        endSlot: newStartSlot + duration,
        midi: newMidi
      }
    } else if (mode === 'drum' && note.drumSound) {
      const currentRowIndex = DRUM_SOUNDS.findIndex(d => d.key === note.drumSound)
      const newRowIndex = Math.max(0, Math.min(DRUM_SOUNDS.length - 1, currentRowIndex + deltaRow))
      const newDrumSound = DRUM_SOUNDS[newRowIndex].key
      return {
        startSlot: newStartSlot,
        endSlot: newStartSlot + duration,
        drumSound: newDrumSound
      }
    }
    
    return { startSlot: newStartSlot, endSlot: newStartSlot + duration }
  }, [mode, quantizeValue])
  
  // Calculate new start slot for left resize
  const calculateResizeStart = useCallback((
    originalNote: SequencerNote,
    deltaSlots: number
  ): number => {
    const slotsPerSubdiv = getSlotsPerSubdivision(quantizeValue)
    const rawNewStart = originalNote.startSlot + deltaSlots
    return snapSlotToGrid(Math.max(0, Math.min(
      originalNote.endSlot - slotsPerSubdiv,
      rawNewStart
    )), quantizeValue)
  }, [quantizeValue])
  
  // Calculate new end slot for right resize
  const calculateResizeEnd = useCallback((
    originalNote: SequencerNote,
    deltaSlots: number
  ): number => {
    const slotsPerSubdiv = getSlotsPerSubdivision(quantizeValue)
    const rawNewEnd = originalNote.endSlot + deltaSlots
    return snapSlotToGrid(Math.max(
      originalNote.startSlot + slotsPerSubdiv,
      rawNewEnd
    ), quantizeValue)
  }, [quantizeValue])
  
  return {
    getSlotDurationMs,
    getSlotsPerSubdiv,
    snapToSlot,
    getTapThreshold,
    getDrawingStateForPosition,
    createNoteFromDrawingState,
    calculateMoveDelta,
    applyMoveToNote,
    calculateResizeStart,
    calculateResizeEnd,
    isValidRow
  }
}

