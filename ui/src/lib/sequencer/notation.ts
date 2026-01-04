import { SequencerNote, QuantizeValue, MAX_CYCLES, DrumSound } from './types'
import { quantizeNotes, getSubdivisionsPerCycle } from './quantization'
import { midiToNoteName } from './keyMapping'

interface SlotContent {
  notes: number[] // MIDI numbers (piano) or drum row indices (drum)
  held: boolean // True if this slot continues a note from previous slot
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
  
  return pianoToStrudel(notes, cycleDurationMs, quantizeValue)
}

/**
 * Convert piano notes to Strudel mini-notation
 */
const pianoToStrudel = (
  notes: SequencerNote[],
  cycleDurationMs: number,
  quantizeValue: QuantizeValue
): string => {
  // Filter to only piano notes with valid midi
  const pianoNotes = notes.filter(n => n.type === 'piano' && n.midi !== undefined)
  
  if (pianoNotes.length === 0) {
    return ''
  }
  
  // Quantize notes first
  const quantizedNotes = quantizeNotes(pianoNotes, cycleDurationMs, quantizeValue)
  
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
      
      const slotContent: SlotContent = { notes: [], held: false }
      
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
          slotContent.held = true
        }
      }
      
      slots.push(slotContent)
    }
    
    // Convert slots to notation
    const cycleNotation = slotsToNotation(slots, 'piano')
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
 * Convert slot content array to notation string for a single cycle (piano mode)
 * Note: mode parameter is for future drum mode support
 */
const slotsToNotation = (slots: SlotContent[], _mode: 'piano' | 'drum'): string => {
  void _mode // Reserved for future drum mode support
  const tokens: string[] = []
  let i = 0
  
  while (i < slots.length) {
    const slot = slots[i]
    
    if (slot.notes.length > 0) {
      // This slot has new note onset(s)
      const noteStr = formatNotes(slot.notes)
      
      // Count how many consecutive slots this note is held
      let duration = 1
      let j = i + 1
      while (j < slots.length && slots[j].notes.length === 0 && slots[j].held) {
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
    } else if (slot.held) {
      // This slot is a continuation of a previous note (already handled above)
      // This case shouldn't normally be reached, but handle it as rest
      i++
    } else {
      // Rest - count consecutive rests
      let restCount = 1
      let j = i + 1
      while (j < slots.length && slots[j].notes.length === 0 && !slots[j].held) {
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
 * Wrap a notation string in note() for piano mode or s() for drum mode
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

// Type for legacy compatibility
type SequencerMode = 'piano' | 'drum'

