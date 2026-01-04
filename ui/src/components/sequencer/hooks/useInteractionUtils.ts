import { useCallback } from 'react'
import {
  SequencerNote,
  SequencerMode,
  QuantizeValue,
  CycleInfo,
  DrumSound,
  DRUM_SOUNDS,
  DEFAULT_CYCLE_DURATION_MS,
  PIANO_MIDI_MIN,
  PIANO_MIDI_MAX
} from '../../../lib/sequencer/types'
import { getSubdivisionsPerCycle } from '../../../lib/sequencer/quantization'
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
  getSlotDurationMs: () => number
  snapToGrid: (ms: number) => number
  getTapThreshold: () => number
  
  // Drawing helpers
  getDrawingStateForPosition: (pos: { x: number; y: number }) => DrawingState | null
  
  // Note creation helpers
  createNoteFromDrawingState: (
    drawingState: DrawingState,
    createNote: (noteData: Omit<SequencerNote, 'id'>) => void,
    playDrum?: (drumSound: DrumSound) => void
  ) => void
  
  // Note movement helpers
  calculateMoveDelta: (
    startPos: { x: number; y: number },
    currentPos: { x: number; y: number }
  ) => { deltaMs: number; deltaRow: number }
  
  applyMoveToNote: (
    note: SequencerNote,
    deltaMs: number,
    deltaRow: number
  ) => Partial<Omit<SequencerNote, 'id'>>
  
  // Resize helpers
  calculateResizeStart: (
    originalNote: SequencerNote,
    deltaMs: number
  ) => number
  
  calculateResizeEnd: (
    originalNote: SequencerNote,
    deltaMs: number
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
  
  // Get the duration of one quantize slot in ms
  const getSlotDurationMs = useCallback(() => {
    const cycleInfo = getCycleInfo()
    const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    const subdivisions = getSubdivisionsPerCycle(quantizeValue)
    return cycleDurationMs / subdivisions
  }, [getCycleInfo, quantizeValue])
  
  // Snap a time value to the grid
  const snapToGrid = useCallback((ms: number) => {
    const slotDurationMs = getSlotDurationMs()
    return Math.round(ms / slotDurationMs) * slotDurationMs
  }, [getSlotDurationMs])
  
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
  const getDrawingStateForPosition = useCallback((pos: { x: number; y: number }): DrawingState | null => {
    const slotDurationMs = getSlotDurationMs()
    const rawTimeMs = xToTimeMs(pos.x)
    const snappedStartMs = Math.floor(rawTimeMs / slotDurationMs) * slotDurationMs
    const row = yToRow(pos.y)
    
    if (!isValidRow(row)) return null
    
    return {
      row,
      startMs: Math.max(0, snappedStartMs),
      currentEndMs: Math.max(0, snappedStartMs) + slotDurationMs
    }
  }, [getSlotDurationMs, xToTimeMs, yToRow, isValidRow])
  
  // Create a note from drawing state
  const createNoteFromDrawingState = useCallback((
    drawingState: DrawingState,
    createNote: (noteData: Omit<SequencerNote, 'id'>) => void,
    playDrum?: (drumSound: DrumSound) => void
  ) => {
    if (mode === 'drum') {
      const drumSound = DRUM_SOUNDS[drawingState.row]?.key
      if (drumSound) {
        createNote({
          type: 'drum',
          drumSound,
          startMs: drawingState.startMs,
          endMs: drawingState.currentEndMs
        })
        playDrum?.(drumSound)
      }
    } else {
      const midi = midiOffset + drawingState.row
      if (midi >= PIANO_MIDI_MIN && midi <= PIANO_MIDI_MAX) {
        createNote({
          type: 'piano',
          midi,
          startMs: drawingState.startMs,
          endMs: drawingState.currentEndMs
        })
      }
    }
  }, [mode, midiOffset])
  
  // Calculate delta for note movement
  const calculateMoveDelta = useCallback((
    startPos: { x: number; y: number },
    currentPos: { x: number; y: number }
  ) => {
    const deltaX = currentPos.x - startPos.x
    const deltaY = currentPos.y - startPos.y
    const deltaMs = deltaX / pixelsPerMs
    const deltaRow = -Math.round(deltaY / laneHeight)
    return { deltaMs, deltaRow }
  }, [pixelsPerMs, laneHeight])
  
  // Apply movement delta to a note
  const applyMoveToNote = useCallback((
    note: SequencerNote,
    deltaMs: number,
    deltaRow: number
  ): Partial<Omit<SequencerNote, 'id'>> => {
    const newStartMs = snapToGrid(Math.max(0, note.startMs + deltaMs))
    const duration = note.endMs - note.startMs
    
    if (mode === 'piano' && note.midi !== undefined) {
      const newMidi = Math.max(PIANO_MIDI_MIN, Math.min(PIANO_MIDI_MAX - 1, note.midi + deltaRow))
      return {
        startMs: newStartMs,
        endMs: newStartMs + duration,
        midi: newMidi
      }
    } else if (mode === 'drum' && note.drumSound) {
      const currentRowIndex = DRUM_SOUNDS.findIndex(d => d.key === note.drumSound)
      const newRowIndex = Math.max(0, Math.min(DRUM_SOUNDS.length - 1, currentRowIndex + deltaRow))
      const newDrumSound = DRUM_SOUNDS[newRowIndex].key
      return {
        startMs: newStartMs,
        endMs: newStartMs + duration,
        drumSound: newDrumSound
      }
    }
    
    return { startMs: newStartMs, endMs: newStartMs + duration }
  }, [mode, snapToGrid])
  
  // Calculate new start time for left resize
  const calculateResizeStart = useCallback((
    originalNote: SequencerNote,
    deltaMs: number
  ): number => {
    const slotDurationMs = getSlotDurationMs()
    return snapToGrid(Math.max(0, Math.min(
      originalNote.endMs - slotDurationMs,
      originalNote.startMs + deltaMs
    )))
  }, [getSlotDurationMs, snapToGrid])
  
  // Calculate new end time for right resize
  const calculateResizeEnd = useCallback((
    originalNote: SequencerNote,
    deltaMs: number
  ): number => {
    const slotDurationMs = getSlotDurationMs()
    return snapToGrid(Math.max(
      originalNote.startMs + slotDurationMs,
      originalNote.endMs + deltaMs
    ))
  }, [getSlotDurationMs, snapToGrid])
  
  return {
    getSlotDurationMs,
    snapToGrid,
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

