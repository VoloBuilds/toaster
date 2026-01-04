import { useCallback, useRef } from 'react'
import { MIDI_START } from '../../lib/sequencer/types'
import { midiToNoteName } from '../../lib/sequencer/keyMapping'

interface PianoKeyboardProps {
  activeKeys: Set<number>
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  octaveOffset?: number
}

// Key layout for 2 octaves (C3-B4)
// Each octave has 7 white keys and 5 black keys
const WHITE_KEYS_PER_OCTAVE = 7
const TOTAL_WHITE_KEYS = WHITE_KEYS_PER_OCTAVE * 2 // 14 white keys

// Map white key index to semitone offset within octave
const WHITE_KEY_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

// Black key positions relative to white keys (which white key it's after)
// Returns null if no black key after that white key
const getBlackKeyAfterWhite = (whiteKeyIndex: number): boolean => {
  const posInOctave = whiteKeyIndex % 7
  // Black keys after: C(0), D(1), F(3), G(4), A(5)
  // No black key after: E(2), B(6)
  return posInOctave !== 2 && posInOctave !== 6
}

// Computer keyboard labels for keys (Ableton-style)
const getKeyLabel = (midi: number, octaveOffset: number): string | null => {
  // Base is C4 (MIDI 60) at octave offset 0
  const baseMidi = 60 + (octaveOffset * 12)
  const offset = midi - baseMidi
  
  const keyMap: Record<number, string> = {
    0: 'A', 2: 'S', 4: 'D', 5: 'F', 7: 'G', 9: 'H', 11: 'J',
    12: 'K', 14: 'L', 16: ';',
    1: 'W', 3: 'E', 6: 'R', 8: 'T', 10: 'Y',
    13: 'U', 15: 'I', 18: 'O'
  }
  
  return keyMap[offset] || null
}

export const PianoKeyboard = ({
  activeKeys,
  onNoteOn,
  onNoteOff,
  octaveOffset = 0
}: PianoKeyboardProps) => {
  const pressedKeysRef = useRef<Set<number>>(new Set())

  const handlePointerDown = useCallback((midi: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pressedKeysRef.current.add(midi)
    onNoteOn(midi)
  }, [onNoteOn])

  const handlePointerUp = useCallback((midi: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    if (pressedKeysRef.current.has(midi)) {
      pressedKeysRef.current.delete(midi)
      onNoteOff(midi)
    }
  }, [onNoteOff])

  const handlePointerLeave = useCallback((midi: number) => (_e: React.PointerEvent) => {
    // Only stop note if pointer was pressed on this key
    void _e
    if (pressedKeysRef.current.has(midi)) {
      pressedKeysRef.current.delete(midi)
      onNoteOff(midi)
    }
  }, [onNoteOff])

  // Calculate the adjusted MIDI range based on octave offset
  const adjustedStart = MIDI_START + (octaveOffset * 12)
  
  // Generate white keys
  const whiteKeys = []
  for (let i = 0; i < TOTAL_WHITE_KEYS; i++) {
    const octave = Math.floor(i / 7)
    const keyInOctave = i % 7
    const midi = adjustedStart + (octave * 12) + WHITE_KEY_SEMITONES[keyInOctave]
    const isActive = activeKeys.has(midi)
    const keyLabel = getKeyLabel(midi, octaveOffset)
    const noteName = midiToNoteName(midi)
    
    whiteKeys.push(
      <button
        key={`white-${i}`}
        onPointerDown={handlePointerDown(midi)}
        onPointerUp={handlePointerUp(midi)}
        onPointerLeave={handlePointerLeave(midi)}
        onPointerCancel={handlePointerUp(midi)}
        className={`
          relative flex-1 h-full min-w-[28px] sm:min-w-[36px]
          rounded-b-md border border-slate-600/50
          transition-all duration-50 ease-out
          touch-none select-none
          ${isActive 
            ? 'bg-gradient-to-b from-slate-300 to-slate-400 translate-y-[2px] shadow-inner' 
            : 'bg-gradient-to-b from-slate-50 to-slate-200 shadow-[0_4px_8px_rgba(0,0,0,0.3)]'
          }
          hover:from-slate-100 hover:to-slate-250
          focus:outline-none focus:ring-2 focus:ring-amber-400/50
        `}
        style={{
          boxShadow: isActive 
            ? 'inset 0 2px 8px rgba(0,0,0,0.2)' 
            : '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Note name at bottom */}
        <span className={`
          absolute bottom-2 left-1/2 -translate-x-1/2
          text-[9px] sm:text-[10px] font-mono uppercase
          ${isActive ? 'text-slate-600' : 'text-slate-500'}
        `}>
          {noteName}
        </span>
        
        {/* Keyboard shortcut label */}
        {keyLabel && (
          <span className={`
            absolute top-2 left-1/2 -translate-x-1/2
            text-[10px] sm:text-xs font-mono font-bold
            ${isActive ? 'text-slate-700' : 'text-slate-400'}
          `}>
            {keyLabel}
          </span>
        )}
        
        {/* Active glow effect */}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-400/30 to-transparent rounded-b-md" />
        )}
      </button>
    )
  }

  // Generate black keys
  const blackKeys = []
  let whiteKeyIndex = 0
  
  for (let i = 0; i < TOTAL_WHITE_KEYS; i++) {
    if (getBlackKeyAfterWhite(i)) {
      const octave = Math.floor(i / 7)
      const keyInOctave = i % 7
      const whiteMidi = adjustedStart + (octave * 12) + WHITE_KEY_SEMITONES[keyInOctave]
      const blackMidi = whiteMidi + 1
      const isActive = activeKeys.has(blackMidi)
      const keyLabel = getKeyLabel(blackMidi, octaveOffset)
      
      // Calculate position based on which white key we're after
      // Each white key is (100 / TOTAL_WHITE_KEYS)% wide
      const whiteKeyWidth = 100 / TOTAL_WHITE_KEYS
      const leftPosition = (i + 1) * whiteKeyWidth - (whiteKeyWidth * 0.35)
      
      blackKeys.push(
        <button
          key={`black-${i}`}
          onPointerDown={handlePointerDown(blackMidi)}
          onPointerUp={handlePointerUp(blackMidi)}
          onPointerLeave={handlePointerLeave(blackMidi)}
          onPointerCancel={handlePointerUp(blackMidi)}
          className={`
            absolute top-0 h-[60%] w-[5%] sm:w-[4.5%] min-w-[18px] sm:min-w-[24px]
            rounded-b-md z-10
            transition-all duration-50 ease-out
            touch-none select-none
            ${isActive
              ? 'bg-gradient-to-b from-slate-700 to-slate-800 translate-y-[2px]'
              : 'bg-gradient-to-b from-slate-800 to-black shadow-[0_4px_6px_rgba(0,0,0,0.5)]'
            }
            hover:from-slate-700 hover:to-slate-900
            focus:outline-none focus:ring-2 focus:ring-amber-400/50
          `}
          style={{
            left: `${leftPosition}%`,
            boxShadow: isActive
              ? 'inset 0 2px 4px rgba(0,0,0,0.5)'
              : '0 4px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Highlight ridge at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-b from-slate-600/50 to-transparent rounded-t-md" />
          
          {/* Keyboard shortcut label */}
          {keyLabel && (
            <span className={`
              absolute top-2 left-1/2 -translate-x-1/2
              text-[9px] sm:text-[10px] font-mono font-bold
              ${isActive ? 'text-slate-400' : 'text-slate-500'}
            `}>
              {keyLabel}
            </span>
          )}
          
          {/* Active glow effect */}
          {isActive && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-400/20 to-transparent rounded-b-md" />
          )}
        </button>
      )
    }
    whiteKeyIndex++
  }

  return (
    <div className="relative w-full h-[120px] sm:h-[140px] flex">
      {/* White keys */}
      <div className="flex w-full h-full gap-[2px]">
        {whiteKeys}
      </div>
      
      {/* Black keys overlaid on top */}
      {blackKeys}
    </div>
  )
}

