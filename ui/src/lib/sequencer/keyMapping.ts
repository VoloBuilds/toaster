// Ableton-style keyboard mapping
// Middle row (home row) = white keys, Top row = black keys

// Base MIDI note for C4 (middle C)
const BASE_MIDI = 60

// Key to semitone offset from C4
const KEY_MAP: Record<string, number> = {
  // White keys (middle row) - C4 to E5
  'a': 0,   // C4
  's': 2,   // D4
  'd': 4,   // E4
  'f': 5,   // F4
  'g': 7,   // G4
  'h': 9,   // A4
  'j': 11,  // B4
  'k': 12,  // C5
  'l': 14,  // D5
  ';': 16,  // E5
  
  // Black keys (top row)
  'w': 1,   // C#4
  'e': 3,   // D#4
  'r': 6,   // F#4
  't': 8,   // G#4
  'y': 10,  // A#4
  'u': 13,  // C#5
  'i': 15,  // D#5
  'o': 18,  // F#5
}

/**
 * Convert a keyboard key to MIDI note number
 * @param key - The key pressed (e.g., 'a', 'w')
 * @param octaveOffset - Octave offset (-2 to +2)
 * @returns MIDI note number or null if key is not mapped
 */
export const keyToMidi = (key: string, octaveOffset: number = 0): number | null => {
  const lowerKey = key.toLowerCase()
  const semitoneOffset = KEY_MAP[lowerKey]
  
  if (semitoneOffset === undefined) {
    return null
  }
  
  // Apply octave offset (12 semitones per octave)
  const midi = BASE_MIDI + semitoneOffset + (octaveOffset * 12)
  
  // Ensure MIDI note is within valid range (0-127)
  if (midi < 0 || midi > 127) {
    return null
  }
  
  return midi
}

/**
 * Convert MIDI note number to note name
 * @param midi - MIDI note number (0-127)
 * @returns Note name (e.g., "c4", "f#5")
 */
export const midiToNoteName = (midi: number): string => {
  const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${noteNames[noteIndex]}${octave}`
}

/**
 * Convert MIDI note number to frequency in Hz
 * @param midi - MIDI note number
 * @returns Frequency in Hz
 */
export const midiToFrequency = (midi: number): number => {
  // A4 = MIDI 69 = 440 Hz
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Get all keys that map to notes
 */
export const getMappedKeys = (): string[] => {
  return Object.keys(KEY_MAP)
}

export { KEY_MAP }

