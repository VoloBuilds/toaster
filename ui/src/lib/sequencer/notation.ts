import { SequencerNote, QuantizeValue, MAX_CYCLES, DrumSound, SequencerMode } from './types'
import { quantizeNotes, getSubdivisionsPerCycle } from './quantization'
import { midiToNoteName } from './keyMapping'

interface SlotContent {
  notes: number[] // MIDI notes that START in this slot
  heldNotes: number[] // MIDI notes that are HELD through this slot (started earlier, still sounding)
}

/**
 * Convert sequencer notes to Strudel mini-notation
 * @param notes - Array of sequencer notes
 * @param cycleDurationMs - Duration of one cycle in milliseconds
 * @param quantizeValue - Quantization resolution
 * @returns Strudel mini-notation string
 */
export const notesToStrudel = (
  notes: SequencerNote[],
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): string => {
  // Handle empty recording
  if (notes.length === 0) {
    return ''
  }
  
  // Check if we're in drum mode (all notes are drum type)
  const isDrumMode = notes.every(n => n.type === 'drum')
  
  if (isDrumMode) {
    return drumsToStrudel(notes, cycleDurationMs, quantizeValue)
  }
  
  return notesToStrudelInternal(notes, cycleDurationMs, quantizeValue)
}

/**
 * Convert melodic notes to Strudel mini-notation
 */
const notesToStrudelInternal = (
  notes: SequencerNote[],
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): string => {
  // Filter to only notes mode with valid midi
  const melodicNotes = notes.filter(n => n.type === 'notes' && n.midi !== undefined)
  
  if (melodicNotes.length === 0) {
    return ''
  }
  
  // Quantize notes first
  const quantizedNotes = quantizeNotes(melodicNotes, cycleDurationMs, quantizeValue)
  
  // Determine total number of cycles from recording duration
  const maxEndTime = Math.max(...quantizedNotes.map(n => n.endMs))
  let totalCycles = Math.ceil(maxEndTime / cycleDurationMs)
  
  // Cap at MAX_CYCLES
  totalCycles = Math.min(totalCycles, MAX_CYCLES)
  
  if (totalCycles === 0) {
    totalCycles = 1
  }
  
  const subdivisions = getSubdivisionsPerCycle(quantizeValue)
  const slotDurationMs = cycleDurationMs / subdivisions
  
  // Process each cycle
  const cycleNotations: string[] = []
  
  for (let cycle = 0; cycle < totalCycles; cycle++) {
    const cycleStartMs = cycle * cycleDurationMs
    const cycleEndMs = (cycle + 1) * cycleDurationMs
    
    // Get notes that are relevant to this cycle
    const cycleNotes = quantizedNotes.filter(note => {
      // Note starts within this cycle
      const startsInCycle = note.startMs >= cycleStartMs && note.startMs < cycleEndMs
      // Note spans into this cycle from previous
      const spansIntoCycle = note.startMs < cycleStartMs && note.endMs > cycleStartMs
      return startsInCycle || spansIntoCycle
    })
    
    // Build slot content array for this cycle
    const slots: SlotContent[] = []
    
    for (let slot = 0; slot < subdivisions; slot++) {
      const slotStartMs = cycleStartMs + (slot * slotDurationMs)
      const slotEndMs = slotStartMs + slotDurationMs
      
      const slotContent: SlotContent = { notes: [], heldNotes: [] }
      
      for (const note of cycleNotes) {
        // Clamp note to cycle boundaries
        const noteStart = Math.max(note.startMs, cycleStartMs)
        const noteEnd = Math.min(note.endMs, cycleEndMs)
        
        // Check if note starts in this slot
        if (noteStart >= slotStartMs && noteStart < slotEndMs) {
          if (note.midi !== undefined) {
            slotContent.notes.push(note.midi)
          }
        }
        // Check if note is held through this slot (started before, ends after)
        else if (noteStart < slotStartMs && noteEnd > slotStartMs) {
          if (note.midi !== undefined) {
            slotContent.heldNotes.push(note.midi)
          }
        }
      }
      
      slots.push(slotContent)
    }
    
    // Convert slots to notation
    const cycleNotation = slotsToNotation(slots, 'notes')
    cycleNotations.push(cycleNotation)
  }
  
  // Combine cycles
  // If all cycles are identical, just return single cycle
  const allIdentical = cycleNotations.every(n => n === cycleNotations[0])
  
  if (totalCycles === 1 || allIdentical) {
    return cycleNotations[0]
  }
  
  // Multiple different cycles: use <[cycle1] [cycle2] ...> syntax
  return `<${cycleNotations.map(n => `[${n}]`).join(' ')}>`
}

/**
 * Convert drum notes to Strudel mini-notation
 */
const drumsToStrudel = (
  notes: SequencerNote[],
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): string => {
  // Filter to only drum notes with valid drumSound
  const drumNotes = notes.filter(n => n.type === 'drum' && n.drumSound !== undefined)
  
  if (drumNotes.length === 0) {
    return ''
  }
  
  // Quantize notes first
  const quantizedNotes = quantizeNotes(drumNotes, cycleDurationMs, quantizeValue)
  
  // Determine total number of cycles from recording duration
  const maxEndTime = Math.max(...quantizedNotes.map(n => n.endMs))
  let totalCycles = Math.ceil(maxEndTime / cycleDurationMs)
  
  // Cap at MAX_CYCLES
  totalCycles = Math.min(totalCycles, MAX_CYCLES)
  
  if (totalCycles === 0) {
    totalCycles = 1
  }
  
  const subdivisions = getSubdivisionsPerCycle(quantizeValue)
  const slotDurationMs = cycleDurationMs / subdivisions
  
  // Process each cycle
  const cycleNotations: string[] = []
  
  for (let cycle = 0; cycle < totalCycles; cycle++) {
    const cycleStartMs = cycle * cycleDurationMs
    const cycleEndMs = (cycle + 1) * cycleDurationMs
    
    // Get notes that are relevant to this cycle
    const cycleNotes = quantizedNotes.filter(note => {
      const startsInCycle = note.startMs >= cycleStartMs && note.startMs < cycleEndMs
      return startsInCycle
    })
    
    // Build slot content array for this cycle
    const slots: { sounds: DrumSound[] }[] = []
    
    for (let slot = 0; slot < subdivisions; slot++) {
      const slotStartMs = cycleStartMs + (slot * slotDurationMs)
      const slotEndMs = slotStartMs + slotDurationMs
      
      const slotContent: { sounds: DrumSound[] } = { sounds: [] }
      
      for (const note of cycleNotes) {
        // Check if note starts in this slot
        if (note.startMs >= slotStartMs && note.startMs < slotEndMs) {
          if (note.drumSound !== undefined) {
            slotContent.sounds.push(note.drumSound)
          }
        }
      }
      
      slots.push(slotContent)
    }
    
    // Convert slots to drum notation
    const cycleNotation = drumSlotsToNotation(slots)
    cycleNotations.push(cycleNotation)
  }
  
  // Combine cycles
  const allIdentical = cycleNotations.every(n => n === cycleNotations[0])
  
  if (totalCycles === 1 || allIdentical) {
    return cycleNotations[0]
  }
  
  // Multiple different cycles
  return `<${cycleNotations.map(n => `[${n}]`).join(' ')}>`
}

/**
 * Check if there are overlapping notes (notes that start while others are being held)
 */
const hasOverlappingNotes = (slots: SlotContent[]): boolean => {
  for (const slot of slots) {
    // If a slot has both new notes starting AND notes being held from before,
    // we have an overlap situation that needs parallel patterns
    if (slot.notes.length > 0 && slot.heldNotes.length > 0) {
      return true
    }
  }
  return false
}

/**
 * Generate notation for a single voice (one MIDI note tracked through its duration)
 * Returns an array of { slotIndex, duration } for where this note plays
 */
interface NoteEvent {
  slotIndex: number
  duration: number
  midi: number
}

/**
 * Extract all note events from slots, tracking each note's start and duration
 */
const extractNoteEvents = (slots: SlotContent[]): NoteEvent[] => {
  const events: NoteEvent[] = []
  
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    
    for (const midi of slot.notes) {
      // Count duration: how many consecutive slots is this specific note held?
      let duration = 1
      let j = i + 1
      while (j < slots.length && slots[j].heldNotes.includes(midi)) {
        duration++
        j++
      }
      events.push({ slotIndex: i, duration, midi })
    }
  }
  
  return events
}

/**
 * Group overlapping note events into separate voices for parallel patterns
 * Notes that don't overlap can share a voice
 */
const groupIntoVoices = (events: NoteEvent[]): NoteEvent[][] => {
  if (events.length === 0) return []
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.slotIndex - b.slotIndex)
  
  // Greedy voice assignment: assign each event to first voice that doesn't conflict
  const voices: NoteEvent[][] = []
  
  for (const event of sortedEvents) {
    const eventEnd = event.slotIndex + event.duration
    
    // Find a voice where this event doesn't overlap with existing events
    let assigned = false
    for (const voice of voices) {
      const hasConflict = voice.some(existingEvent => {
        const existingEnd = existingEvent.slotIndex + existingEvent.duration
        // Check if ranges overlap
        return !(eventEnd <= existingEvent.slotIndex || event.slotIndex >= existingEnd)
      })
      
      if (!hasConflict) {
        voice.push(event)
        assigned = true
        break
      }
    }
    
    if (!assigned) {
      // Create a new voice for this event
      voices.push([event])
    }
  }
  
  return voices
}

/**
 * Generate notation string for a single voice
 */
const voiceToNotation = (events: NoteEvent[], totalSlots: number): string => {
  // Sort events by slot index
  const sortedEvents = [...events].sort((a, b) => a.slotIndex - b.slotIndex)
  
  const tokens: string[] = []
  let currentSlot = 0
  
  for (const event of sortedEvents) {
    // Add rests before this event if needed
    if (event.slotIndex > currentSlot) {
      const restDuration = event.slotIndex - currentSlot
      if (restDuration > 1) {
        tokens.push(`~@${restDuration}`)
      } else {
        tokens.push('~')
      }
    }
    
    // Add the note with duration
    const noteName = midiToNoteName(event.midi)
    if (event.duration > 1) {
      tokens.push(`${noteName}@${event.duration}`)
    } else {
      tokens.push(noteName)
    }
    
    currentSlot = event.slotIndex + event.duration
  }
  
  // Add trailing rests if needed
  if (currentSlot < totalSlots) {
    const restDuration = totalSlots - currentSlot
    if (restDuration > 1) {
      tokens.push(`~@${restDuration}`)
    } else {
      tokens.push('~')
    }
  }
  
  return tokens.join(' ')
}

/**
 * Convert slot content array to notation string for a single cycle (notes mode)
 * Handles overlapping notes by generating parallel patterns with comma separation
 */
const slotsToNotation = (slots: SlotContent[], _mode: 'notes' | 'drum'): string => {
  void _mode // Reserved for future drum mode support
  
  // Check if we need parallel patterns for overlapping notes
  if (hasOverlappingNotes(slots)) {
    // Extract all note events with their durations
    const events = extractNoteEvents(slots)
    
    if (events.length === 0) {
      // All rests
      return formatRests(slots)
    }
    
    // Group events into non-overlapping voices
    const voices = groupIntoVoices(events)
    
    // Generate notation for each voice
    const voiceNotations = voices.map(voice => voiceToNotation(voice, slots.length))
    
    // Join with comma for parallel patterns
    return voiceNotations.join(', ')
  }
  
  // Simple case: no overlapping notes, use original sequential approach
  return slotsToNotationSimple(slots)
}

/**
 * Format a rest-only pattern from slots
 */
const formatRests = (slots: SlotContent[]): string => {
  if (slots.length > 1) {
    return `~@${slots.length}`
  }
  return '~'
}

/**
 * Simple notation for non-overlapping notes (original algorithm)
 */
const slotsToNotationSimple = (slots: SlotContent[]): string => {
  const tokens: string[] = []
  let i = 0
  
  while (i < slots.length) {
    const slot = slots[i]
    
    if (slot.notes.length > 0) {
      // This slot has new note onset(s)
      const noteStr = formatNotes(slot.notes)
      
      // Count how many consecutive slots this note is held
      // Now we check if the specific notes are in heldNotes
      let duration = 1
      let j = i + 1
      // For simple case (no overlaps), check if next slots hold ANY of the notes that started
      const startingNotes = slot.notes
      while (j < slots.length && 
             slots[j].notes.length === 0 && 
             startingNotes.some(n => slots[j].heldNotes.includes(n))) {
        duration++
        j++
      }
      
      // Format with duration if > 1
      if (duration > 1) {
        tokens.push(`${noteStr}@${duration}`)
        i = j
      } else {
        tokens.push(noteStr)
        i++
      }
    } else if (slot.heldNotes.length > 0) {
      // This slot is a continuation of a previous note (already handled above)
      // This case shouldn't normally be reached, but handle it as rest
      i++
    } else {
      // Rest - count consecutive rests
      let restCount = 1
      let j = i + 1
      while (j < slots.length && slots[j].notes.length === 0 && slots[j].heldNotes.length === 0) {
        restCount++
        j++
      }
      
      // Format rest
      if (restCount > 1) {
        tokens.push(`~@${restCount}`)
        i = j
      } else {
        tokens.push('~')
        i++
      }
    }
  }
  
  return tokens.join(' ')
}

/**
 * Convert drum slot content to notation string for a single cycle
 */
const drumSlotsToNotation = (slots: { sounds: DrumSound[] }[]): string => {
  const tokens: string[] = []
  let i = 0
  
  while (i < slots.length) {
    const slot = slots[i]
    
    if (slot.sounds.length > 0) {
      // This slot has drum hit(s)
      const soundStr = formatDrumSounds(slot.sounds)
      tokens.push(soundStr)
      i++
    } else {
      // Rest - count consecutive rests
      let restCount = 1
      let j = i + 1
      while (j < slots.length && slots[j].sounds.length === 0) {
        restCount++
        j++
      }
      
      // Format rest
      if (restCount > 1) {
        tokens.push(`~@${restCount}`)
        i = j
      } else {
        tokens.push('~')
        i++
      }
    }
  }
  
  return tokens.join(' ')
}

/**
 * Format MIDI notes as notation
 * Single note: "c4"
 * Chord: "[c4,e4,g4]"
 */
const formatNotes = (midiNotes: number[]): string => {
  if (midiNotes.length === 0) {
    return '~'
  }
  
  const noteNames = midiNotes.map(midi => midiToNoteName(midi))
  
  if (noteNames.length === 1) {
    return noteNames[0]
  }
  
  // Chord - sort by pitch for consistent output
  noteNames.sort()
  return `[${noteNames.join(',')}]`
}

/**
 * Format drum sounds as notation
 * Single sound: "bd"
 * Multiple: "[bd,sd]"
 */
const formatDrumSounds = (sounds: DrumSound[]): string => {
  if (sounds.length === 0) {
    return '~'
  }
  
  if (sounds.length === 1) {
    return sounds[0]
  }
  
  // Multiple sounds at same time
  return `[${sounds.join(',')}]`
}

/**
 * Wrap a notation string in note() for notes mode or s() for drum mode
 */
export const wrapPattern = (notation: string, mode: SequencerMode): string => {
  if (!notation) {
    return ''
  }
  
  if (mode === 'drum') {
    return `s("${notation}")`
  }
  
  return `note("${notation}")`
}

/**
 * Legacy function - wraps notation in note() for appending to prompt
 */
export const wrapInNote = (notation: string): string => {
  if (!notation) {
    return ''
  }
  return `note("${notation}")`
}


