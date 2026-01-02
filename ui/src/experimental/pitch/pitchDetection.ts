import Pitchfinder from 'pitchfinder'

// Create pitch detectors - YIN is more accurate but AMDF is more stable
// We'll use AMDF as primary since YIN returns too many garbage values (~19kHz)
export const createPitchDetector = (sampleRate: number) => {
  // AMDF (Average Magnitude Difference Function) is more stable for voice
  // It's less prone to returning garbage values during pitch transitions
  const amdf = Pitchfinder.AMDF({ sampleRate })
  
  // Also create YIN as fallback for more accuracy on clear signals
  const yin = Pitchfinder.YIN({ 
    sampleRate,
    threshold: 0.1 // Slightly less sensitive to reduce garbage
  })
  
  // Hybrid detector: prefer the LOWEST valid pitch to avoid harmonics
  // Humming range is typically 80-350 Hz (E2 to F4), not higher
  const MIN_PITCH = 80   // ~E2
  const MAX_PITCH = 350  // ~F4 - above this is likely a harmonic
  
  return (buffer: Float32Array): number | null => {
    const amdfPitch = amdf(buffer)
    const yinPitch = yin(buffer)
    
    // Check which pitches are valid (within reasonable humming range)
    const amdfValid = amdfPitch && amdfPitch > MIN_PITCH && amdfPitch < MAX_PITCH
    const yinValid = yinPitch && yinPitch > MIN_PITCH && yinPitch < MAX_PITCH
    
    let selectedPitch: number | null = null
    
    if (amdfValid && yinValid) {
      // Both valid - prefer the LOWER one (more likely fundamental, not harmonic)
      selectedPitch = amdfPitch! <= yinPitch! ? amdfPitch! : yinPitch!
    } else if (amdfValid) {
      selectedPitch = amdfPitch!
    } else if (yinValid) {
      selectedPitch = yinPitch!
    }
    
    return selectedPitch
  }
}

// Calculate RMS amplitude of audio buffer
export const calculateRMS = (buffer: Float32Array): number => {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

// Minimum amplitude threshold for pitch detection (prevents detecting noise)
export const MIN_AMPLITUDE_THRESHOLD = 0.01

// Convert frequency in Hz to MIDI note number
export const frequencyToMidi = (freq: number): number => {
  // Guard against invalid frequencies that would cause NaN/Infinity
  if (freq <= 0 || !isFinite(freq)) return 0
  return Math.round(12 * Math.log2(freq / 440) + 69)
}

// Convert MIDI note number to Strudel note name (e.g., 60 → "c4", 69 → "a4")
export const midiToNoteName = (midi: number): string => {
  const noteNames = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${noteNames[noteIndex]}${octave}`
}

// Get display name for a note (with sharp symbol for piano labels)
export const midiToDisplayName = (midi: number): string => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${noteNames[noteIndex]}${octave}`
}

export interface NoteEvent {
  note: string
  midi: number
  startMs: number
  endMs: number
}

interface QuantizedSlot {
  notes: string[]
  duration: number // in grid units
  isOnset: boolean // true if this slot has a note onset, false if sustained
}

// Pitch smoother interface (functional style)
export interface PitchSmootherInstance {
  process: (midi: number | null, timestamp: number) => number | null
  reset: () => void
}

// Create a pitch smoother to reduce jitter (functional factory)
// Now includes holdover behavior to maintain pitch during brief dropouts
// Also aggressive smoothing to avoid transition noise
export const createPitchSmoother = (bufferSize: number = 5): PitchSmootherInstance => {
  let buffer: number[] = []
  let lastConfirmedMidi: number | null = null
  let lastConfirmedTime = 0
  let lastValidPitchTime = 0
  const minHoldMs = 120 // Minimum time to hold a note before allowing 1-semitone change
  const holdoverMs = 150 // Continue previous pitch during brief dropouts
  const minSemitoneDiff = 2 // Require at least 2 semitone difference for immediate note change

  const process = (midi: number | null, timestamp: number): number | null => {
    if (midi === null) {
      // No pitch detected - but use holdover behavior instead of immediately dropping
      // If we had a valid pitch recently, continue it for holdoverMs
      if (lastConfirmedMidi !== null && (timestamp - lastValidPitchTime) < holdoverMs) {
        // Continue the previous pitch during brief dropout
        return lastConfirmedMidi
      }
      // Dropout exceeded holdover period - clear and return null
      buffer = []
      return null
    }

    // Valid pitch received - update last valid time
    lastValidPitchTime = timestamp

    // Add to rolling buffer
    buffer.push(midi)
    if (buffer.length > bufferSize) {
      buffer.shift()
    }

    // Calculate median (more robust than mean)
    const sorted = [...buffer].sort((a, b) => a - b)
    const medianMidi = sorted[Math.floor(sorted.length / 2)]

    // Hysteresis: only change note if difference >= 1 semitone and held for minHoldMs
    if (lastConfirmedMidi === null) {
      lastConfirmedMidi = medianMidi
      lastConfirmedTime = timestamp
      return medianMidi
    }

    const diff = Math.abs(medianMidi - lastConfirmedMidi)
    const timeSinceLastChange = timestamp - lastConfirmedTime

    // Require either: 2+ semitone jump (clear note change), or 1 semitone held for minHoldMs
    const isSignificantJump = diff >= minSemitoneDiff
    const isHeldLongEnough = diff >= 1 && timeSinceLastChange >= minHoldMs
    
    if (isSignificantJump || isHeldLongEnough) {
      lastConfirmedMidi = medianMidi
      lastConfirmedTime = timestamp
      return medianMidi
    }

    return lastConfirmedMidi
  }

  const reset = () => {
    buffer = []
    lastConfirmedMidi = null
    lastConfirmedTime = 0
    lastValidPitchTime = 0
  }

  return { process, reset }
}

// Default cycle duration in ms when no song is playing
export const DEFAULT_CYCLE_MS = 2000

// Maximum number of cycles to record
export const MAX_CYCLES = 4

// Process a single cycle's notes into Strudel notation
const processSingleCycle = (
  noteEvents: NoteEvent[],
  cycleDurationMs: number
): string => {
  if (noteEvents.length === 0) return '~'

  // Target 8 subdivisions for one cycle
  const numSlots = 8
  const slotDurationMs = cycleDurationMs / numSlots
  const minNoteDurationMs = 100 // Minimum note duration threshold - filters out jitter

  // Filter out very short notes (noise)
  const filteredNotes = noteEvents.filter(n => n.endMs - n.startMs >= minNoteDurationMs)
  
  if (filteredNotes.length === 0) return '~'

  // Assign notes to slots using onset time (not center)
  const slots: QuantizedSlot[] = []
  
  for (let i = 0; i < numSlots; i++) {
    const slotStartMs = i * slotDurationMs
    const slotEndMs = (i + 1) * slotDurationMs
    
    // Find notes whose onset falls in this slot
    const notesInSlot = filteredNotes.filter(n => {
      // Use note onset time for slot assignment
      return n.startMs >= slotStartMs && n.startMs < slotEndMs
    })
    
    if (notesInSlot.length === 0) {
      // Check if a note from a previous slot is still sounding
      const sustainedNote = filteredNotes.find(n => 
        n.startMs < slotStartMs && n.endMs > slotStartMs
      )
      if (sustainedNote) {
        // This slot is covered by a sustained note - mark as NOT an onset
        slots.push({ notes: [sustainedNote.note], duration: 1, isOnset: false })
      } else {
        slots.push({ notes: ['~'], duration: 1, isOnset: false })
      }
    } else {
      // Pick the LONGEST note only - avoid brackets with multiple notes
      // This eliminates jitter from brief transition notes
      const sortedByDuration = [...notesInSlot].sort((a, b) => 
        (b.endMs - b.startMs) - (a.endMs - a.startMs)
      )
      // Only take the single longest note - mark as onset (new note starts here)
      slots.push({ notes: [sortedByDuration[0].note], duration: 1, isOnset: true })
    }
  }

  // Merge consecutive identical slots using @N notation
  // BUT: don't merge if the new slot has an onset (separate note event)
  const mergedSlots: QuantizedSlot[] = []
  
  for (const slot of slots) {
    const lastSlot = mergedSlots[mergedSlots.length - 1]
    
    // Only merge if: same notes AND current slot is NOT an onset (just sustained)
    if (lastSlot && arraysEqual(lastSlot.notes, slot.notes) && !slot.isOnset) {
      lastSlot.duration += 1
    } else {
      mergedSlots.push({ ...slot })
    }
  }

  // Convert to Strudel notation
  const notation = mergedSlots.map(slot => {
    let noteStr: string
    
    if (slot.notes.length === 1) {
      noteStr = slot.notes[0]
    } else {
      // Multiple notes in same slot: use brackets
      noteStr = `[${slot.notes.join(' ')}]`
    }
    
    // Add duration modifier if held longer
    if (slot.duration > 1) {
      noteStr = `${noteStr}@${slot.duration}`
    }
    
    return noteStr
  }).join(' ')

  return notation
}

// Process a recording of note events into Strudel mini-notation
// Supports multi-cycle output with <> notation
export const processRecording = (
  noteEvents: NoteEvent[],
  totalDurationMs: number,
  cycleDurationMs: number = DEFAULT_CYCLE_MS
): string => {
  if (noteEvents.length === 0) return '~'

  // Determine number of cycles
  let numCycles = Math.round(totalDurationMs / cycleDurationMs)
  numCycles = Math.max(1, Math.min(numCycles, MAX_CYCLES))

  // If only one cycle, process normally without <>
  if (numCycles === 1) {
    return processSingleCycle(noteEvents, totalDurationMs)
  }

  // Process each cycle independently
  const cycleNotations: string[] = []
  
  for (let c = 0; c < numCycles; c++) {
    const cycleStartMs = c * cycleDurationMs
    const cycleEndMs = (c + 1) * cycleDurationMs
    
    // Get notes that belong to this cycle
    const cycleNotes = noteEvents
      .filter(n => {
        // Note overlaps with this cycle
        return n.endMs > cycleStartMs && n.startMs < cycleEndMs
      })
      .map(n => ({
        ...n,
        // Adjust timestamps relative to cycle start
        startMs: Math.max(0, n.startMs - cycleStartMs),
        endMs: Math.min(cycleDurationMs, n.endMs - cycleStartMs)
      }))
    
    const cycleNotation = processSingleCycle(cycleNotes, cycleDurationMs)
    cycleNotations.push(cycleNotation)
  }

  // Check if all cycles are identical - if so, just return one
  const allIdentical = cycleNotations.every(n => n === cycleNotations[0])
  if (allIdentical) {
    return cycleNotations[0]
  }

  // Return multi-cycle notation with <> - each cycle wrapped in [] to be treated as a single unit
  // Without brackets, Strudel would interpret space-separated notes as all in one cycle
  return `<${cycleNotations.map(c => `[${c}]`).join(' ')}>`
}

// Trim leading empty cycles from note events
// Also optionally shifts notes within the first cycle to reduce accidental initial silence
// Returns adjusted note events and the effective start time
export const trimLeadingSilence = (
  noteEvents: NoteEvent[],
  totalDurationMs: number,
  cycleDurationMs: number = DEFAULT_CYCLE_MS
): { events: NoteEvent[], effectiveStartMs: number, effectiveDurationMs: number } => {
  if (noteEvents.length === 0) {
    return { events: [], effectiveStartMs: 0, effectiveDurationMs: totalDurationMs }
  }

  // Find the first note's start time
  const firstNoteMs = Math.min(...noteEvents.map(n => n.startMs))
  
  // Find which cycle contains the first note
  const firstNoteCycle = Math.floor(firstNoteMs / cycleDurationMs)
  
  // Calculate position within the first cycle
  const positionInFirstCycle = firstNoteMs - (firstNoteCycle * cycleDurationMs)
  const slotDurationMs = cycleDurationMs / 8
  
  // Smart shift: if first note is within the first 3 slots (< 37.5% of cycle),
  // assume it's accidental delay and shift to beat 1.
  // If later (slots 4-8), assume intentional syncopation and preserve position.
  const isLikelyReactionDelay = positionInFirstCycle < (slotDurationMs * 3)
  
  let shiftAmount = firstNoteCycle * cycleDurationMs // Always trim complete cycles
  
  if (isLikelyReactionDelay) {
    // Shift to beat 1 of the cycle (remove reaction time delay)
    shiftAmount = firstNoteMs
  }
  
  // Adjust all note timestamps relative to the shift
  const adjustedEvents = noteEvents.map(n => ({
    ...n,
    startMs: Math.max(0, n.startMs - shiftAmount),
    endMs: n.endMs - shiftAmount
  }))
  
  const effectiveDurationMs = totalDurationMs - shiftAmount
  
  return { events: adjustedEvents, effectiveStartMs: shiftAmount, effectiveDurationMs }
}

// Helper function to compare arrays
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// Pitch buffer for the visualization
export interface PitchSample {
  midi: number | null // null means no pitch detected
  timestamp: number
}

export const SAMPLE_HISTORY_SIZE = 100 // Number of samples to keep for visualization

