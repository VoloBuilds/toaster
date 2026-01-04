// Type definitions for the sequencer feature

// Sequencer modes
export type SequencerMode = 'piano' | 'drum'

// Drum sound types
export type DrumSound = 'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'cr' | 'rd' | 'ht' | 'mt' | 'lt' | 'rim'

// Drum sound configuration
export interface DrumSoundConfig {
  key: DrumSound
  label: string
  description: string
}

// Available drum sounds (ordered from top to bottom in grid)
export const DRUM_SOUNDS: DrumSoundConfig[] = [
  { key: 'cr', label: 'Crash', description: 'Crash cymbal' },
  { key: 'rd', label: 'Ride', description: 'Ride cymbal' },
  { key: 'oh', label: 'Open HH', description: 'Open hi-hat' },
  { key: 'hh', label: 'Closed HH', description: 'Closed hi-hat' },
  { key: 'ht', label: 'High Tom', description: 'High tom' },
  { key: 'mt', label: 'Mid Tom', description: 'Mid tom' },
  { key: 'lt', label: 'Low Tom', description: 'Low tom' },
  { key: 'cp', label: 'Clap', description: 'Clap/handclap' },
  { key: 'sd', label: 'Snare', description: 'Snare drum' },
  { key: 'rim', label: 'Rim', description: 'Rimshot' },
  { key: 'bd', label: 'Kick', description: 'Bass drum/kick' },
]

// Sequencer note - supports both piano and drum modes
export interface SequencerNote {
  id: string
  type: 'piano' | 'drum'
  // For piano mode
  midi?: number
  // For drum mode
  drumSound?: DrumSound
  // Timing (both modes)
  startMs: number
  endMs: number
}

// Legacy RecordedNote type for backwards compatibility
export interface RecordedNote {
  id: string
  midi: number
  startMs: number
  endMs: number
}

// Convert SequencerNote to RecordedNote (for piano mode)
export const toRecordedNote = (note: SequencerNote): RecordedNote | null => {
  if (note.type !== 'piano' || note.midi === undefined) return null
  return {
    id: note.id,
    midi: note.midi,
    startMs: note.startMs,
    endMs: note.endMs
  }
}

// Convert RecordedNote to SequencerNote
export const fromRecordedNote = (note: RecordedNote): SequencerNote => ({
  id: note.id,
  type: 'piano',
  midi: note.midi,
  startMs: note.startMs,
  endMs: note.endMs
})

export type QuantizeValue = '1/4' | '1/8' | '1/16' | '1/32' | '1/4T' | '1/8T' | '1/16T' | '1/32T'

// Re-export CycleInfo from StrudelEditor for convenience
export interface CycleInfo {
  cps: number // cycles per second
  phase: number // current position within cycle (0-1)
  cycleDurationMs: number // duration of one cycle in ms
}

// MIDI note range for 2 octaves (C3-C5) - used for piano keyboard
export const MIDI_START = 48 // C3
export const MIDI_END = 72 // C5
export const NUM_OCTAVES = 2
export const NOTES_PER_OCTAVE = 12

// Default cycle duration when Strudel is not playing (2 seconds)
export const DEFAULT_CYCLE_DURATION_MS = 2000

// Maximum recording length in cycles
export const MAX_CYCLES = 8

// Default recording cycles
export const DEFAULT_RECORDING_CYCLES = 2

// ============================================
// Sequencer Grid - Fixed Canvas Dimensions
// ============================================

// Fixed canvas dimensions (never change with zoom)
export const MONITOR_CANVAS_WIDTH = 480
export const MONITOR_CANVAS_HEIGHT = 200

// Default view settings
export const DEFAULT_VISIBLE_SEMITONES = 24  // 2 octaves at default zoom
export const DEFAULT_VISIBLE_DURATION_CYCLES = 2  // Show 2 cycles worth of time

// Zoom limits (semitones)
export const MIN_VISIBLE_SEMITONES = 12   // 1 octave (max zoom in)
export const MAX_VISIBLE_SEMITONES = 48   // 4 octaves (max zoom out)

// Zoom limits (time)
export const MIN_VISIBLE_DURATION_CYCLES = 0.5  // Half a cycle (max zoom in)
export const MAX_VISIBLE_DURATION_CYCLES = 8    // Full recording (max zoom out)

// MIDI range for entire piano
export const PIANO_MIDI_MIN = 21   // A0
export const PIANO_MIDI_MAX = 108  // C8

// View state interface for SequencerGrid
export interface SequencerViewState {
  // Vertical: which MIDI notes are visible (piano mode) or which drum rows (drum mode)
  midiOffset: number           // Lowest visible MIDI note (piano) or row offset (drum)
  visibleSemitones: number     // How many semitones visible (zoom level)
  
  // Horizontal: which time range is visible
  timeOffsetMs: number         // Start of visible time window
  visibleDurationMs: number    // Duration of visible time (zoom level)
}

// Legacy alias for backwards compatibility
export type MidiMonitorViewState = SequencerViewState

