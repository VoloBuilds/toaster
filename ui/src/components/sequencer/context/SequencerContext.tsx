import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useNoteState } from '../useNoteState'
import { useAudioPreview } from '../useAudioPreview'
import { useDrumPreview } from '../useDrumPreview'
import { usePlaybackPreview } from '../usePlaybackPreview'
import { notesToStrudel, wrapPattern } from '../../../lib/sequencer/notation'
import {
  SequencerNote,
  SequencerMode,
  SequencerViewState,
  QuantizeValue,
  CycleInfo,
  DrumSound,
  DEFAULT_CYCLE_DURATION_MS,
  DEFAULT_RECORDING_CYCLES,
  DEFAULT_VISIBLE_SEMITONES,
  DEFAULT_VISIBLE_DURATION_CYCLES,
  MIDI_START,
  PIANO_MIDI_MIN,
  PIANO_MIDI_MAX,
  MIN_VISIBLE_SEMITONES,
  MAX_VISIBLE_SEMITONES,
  MIN_VISIBLE_DURATION_CYCLES,
  MAX_VISIBLE_DURATION_CYCLES,
  DRUM_SOUNDS
} from '../../../lib/sequencer/types'

// Context value interface
interface SequencerContextValue {
  // Notes
  notes: SequencerNote[]
  createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  createNotes: (notesData: Omit<SequencerNote, 'id'>[]) => void
  updateNote: (id: string, updates: Partial<Omit<SequencerNote, 'id'>>) => void
  deleteNote: (id: string) => void
  deleteNotes: (ids: string[]) => void
  clearNotes: () => void
  startBatchUpdate: () => void
  endBatchUpdate: () => void
  
  // Undo/redo
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  
  // Selection
  selectedNoteIds: Set<string>
  setSelectedNoteIds: (ids: Set<string>) => void
  selectAll: () => void
  clearSelection: () => void
  
  // Clipboard
  clipboardNotes: Omit<SequencerNote, 'id'>[]
  copy: () => void
  paste: () => void
  cut: () => void
  
  // Mode
  mode: SequencerMode
  setMode: (mode: SequencerMode) => void
  
  // Cursor position (for paste)
  cursorPositionMs: number
  setCursorPositionMs: (ms: number) => void
  
  // View state
  viewState: SequencerViewState
  updateViewState: (updates: Partial<SequencerViewState>) => void
  
  // Grid settings
  quantizeValue: QuantizeValue
  setQuantizeValue: (value: QuantizeValue) => void
  cycleCount: number
  setCycleCount: (count: number) => void
  
  // Strudel integration
  getCycleInfo: () => CycleInfo | null
  cycleDurationMs: number
  isPlaying: boolean
  playbackPositionMs: number
  
  // Actions
  sendToPrompt: () => void
  handleClear: () => void
  
  // Audio preview
  playDrum: (drumSound: DrumSound) => void
}

const SequencerContext = createContext<SequencerContextValue | null>(null)

// Provider props
interface SequencerProviderProps {
  children: ReactNode
  getCycleInfo?: () => CycleInfo | null
  isStrudelPlaying?: boolean
  onSendToPrompt: (notation: string) => void
}

export const SequencerProvider = ({
  children,
  getCycleInfo,
  isStrudelPlaying = false,
  onSendToPrompt
}: SequencerProviderProps) => {
  // Core state
  const [mode, setModeInternal] = useState<SequencerMode>('piano')
  const [quantizeValue, setQuantizeValue] = useState<QuantizeValue>('1/8')
  const [cycleCount, setCycleCountInternal] = useState(DEFAULT_RECORDING_CYCLES)
  const [cursorPositionMs, setCursorPositionMs] = useState(0)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [clipboardNotes, setClipboardNotes] = useState<Omit<SequencerNote, 'id'>[]>([])
  
  // Get cycle duration
  const cycleDurationMs = getCycleInfo?.()?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
  
  // View states for each mode
  const [pianoViewState, setPianoViewState] = useState<SequencerViewState>(() => ({
    midiOffset: MIDI_START,
    visibleSemitones: DEFAULT_VISIBLE_SEMITONES,
    timeOffsetMs: 0,
    visibleDurationMs: DEFAULT_VISIBLE_DURATION_CYCLES * cycleDurationMs
  }))
  
  const [drumViewState, setDrumViewState] = useState<SequencerViewState>(() => ({
    midiOffset: 0,
    visibleSemitones: DRUM_SOUNDS.length,
    timeOffsetMs: 0,
    visibleDurationMs: DEFAULT_VISIBLE_DURATION_CYCLES * cycleDurationMs
  }))
  
  // Current view state based on mode
  const viewState = mode === 'drum' ? drumViewState : pianoViewState
  const setViewState = mode === 'drum' ? setDrumViewState : setPianoViewState
  
  // Note state hook
  const {
    notes,
    createNote,
    createNotes,
    updateNote,
    deleteNote,
    deleteNotes,
    clearNotes,
    startBatchUpdate,
    endBatchUpdate,
    undo,
    redo,
    canUndo,
    canRedo,
    scaleAllNotes
  } = useNoteState({ mode })
  
  // Audio preview
  const { playNote, playNoteAt, stopNote, stopNoteAt, stopAllNotes } = useAudioPreview()
  const { playDrum, playDrumAt } = useDrumPreview()
  
  // Playback preview - uses look-ahead scheduling for precise sync with Strudel
  const { patternPositionMs: playbackPositionMs } = usePlaybackPreview({
    notes,
    isStrudelPlaying,
    getCycleInfo,
    cycleCount,
    // Immediate playback (for UI feedback fallback)
    playNote,
    stopNote,
    playDrum,
    // Scheduled playback (for synced audio - matches Strudel's 100ms lookahead)
    playNoteAt,
    stopNoteAt,
    playDrumAt
  })
  
  // Update visibleDurationMs and scale notes when cycleDurationMs changes
  const cycleDurationMsRef = useRef(cycleDurationMs)
  useEffect(() => {
    if (cycleDurationMsRef.current !== cycleDurationMs) {
      const ratio = cycleDurationMs / cycleDurationMsRef.current
      
      // Scale all notes to maintain relative positions
      scaleAllNotes(ratio)
      
      // Update view state to maintain visible cycles
      const updateViewState = (prev: SequencerViewState) => {
        const currentVisibleCycles = prev.visibleDurationMs / cycleDurationMsRef.current
        return {
          ...prev,
          visibleDurationMs: currentVisibleCycles * cycleDurationMs
        }
      }
      setPianoViewState(updateViewState)
      setDrumViewState(updateViewState)
      cycleDurationMsRef.current = cycleDurationMs
    }
  }, [cycleDurationMs, scaleAllNotes])
  
  // View state update handler with clamping
  const updateViewState = useCallback((updates: Partial<SequencerViewState>) => {
    setViewState(prev => {
      const next = { ...prev, ...updates }
      
      // Clamp values
      next.visibleSemitones = Math.max(MIN_VISIBLE_SEMITONES, Math.min(MAX_VISIBLE_SEMITONES, next.visibleSemitones))
      next.midiOffset = Math.max(PIANO_MIDI_MIN, Math.min(PIANO_MIDI_MAX - next.visibleSemitones, next.midiOffset))
      
      const minDuration = MIN_VISIBLE_DURATION_CYCLES * cycleDurationMs
      const maxDuration = MAX_VISIBLE_DURATION_CYCLES * cycleDurationMs
      next.visibleDurationMs = Math.max(minDuration, Math.min(maxDuration, next.visibleDurationMs))
      
      const maxTimeOffset = Math.max(0, cycleCount * cycleDurationMs - next.visibleDurationMs)
      next.timeOffsetMs = Math.max(0, Math.min(maxTimeOffset, next.timeOffsetMs))
      
      return next
    })
  }, [cycleDurationMs, cycleCount, setViewState])
  
  // Mode change handler
  const setMode = useCallback((newMode: SequencerMode) => {
    if (newMode === mode) return
    setModeInternal(newMode)
    setSelectedNoteIds(new Set())
    setCursorPositionMs(0)
  }, [mode])
  
  // Cycle count change handler
  const setCycleCount = useCallback((count: number) => {
    setCycleCountInternal(count)
    const maxDuration = count * cycleDurationMs
    setViewState(prev => ({
      ...prev,
      visibleDurationMs: Math.min(prev.visibleDurationMs, maxDuration),
      timeOffsetMs: Math.min(prev.timeOffsetMs, Math.max(0, maxDuration - prev.visibleDurationMs))
    }))
  }, [cycleDurationMs, setViewState])
  
  // Selection helpers
  const selectAll = useCallback(() => {
    setSelectedNoteIds(new Set(notes.map(n => n.id)))
  }, [notes])
  
  const clearSelection = useCallback(() => {
    setSelectedNoteIds(new Set())
  }, [])
  
  // Copy
  const copy = useCallback(() => {
    if (selectedNoteIds.size === 0) return
    
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id))
    if (selectedNotes.length === 0) return
    
    const earliestStart = Math.min(...selectedNotes.map(n => n.startMs))
    
    const clipboard = selectedNotes.map(n => {
      const { id, ...rest } = n
      return {
        ...rest,
        startMs: n.startMs - earliestStart,
        endMs: n.endMs - earliestStart
      }
    })
    
    setClipboardNotes(clipboard)
  }, [notes, selectedNoteIds])
  
  // Paste
  const paste = useCallback(() => {
    if (clipboardNotes.length === 0) return
    
    const compatibleNotes = clipboardNotes.filter(n => n.type === mode)
    if (compatibleNotes.length === 0) return
    
    const newNotes = compatibleNotes.map(n => ({
      ...n,
      startMs: n.startMs + cursorPositionMs,
      endMs: n.endMs + cursorPositionMs
    }))
    
    createNotes(newNotes)
  }, [clipboardNotes, cursorPositionMs, createNotes, mode])
  
  // Cut
  const cut = useCallback(() => {
    copy()
    if (selectedNoteIds.size > 0) {
      deleteNotes(Array.from(selectedNoteIds))
      setSelectedNoteIds(new Set())
    }
  }, [copy, selectedNoteIds, deleteNotes])
  
  // Send to prompt
  const sendToPrompt = useCallback(() => {
    if (notes.length === 0) return
    
    const notation = notesToStrudel(notes, cycleDurationMs, quantizeValue)
    if (notation) {
      const wrapped = wrapPattern(notation, mode)
      onSendToPrompt(wrapped)
    }
  }, [notes, cycleDurationMs, quantizeValue, mode, onSendToPrompt])
  
  // Clear all
  const handleClear = useCallback(() => {
    clearNotes()
    setSelectedNoteIds(new Set())
    setCursorPositionMs(0)
    setViewState(prev => ({ ...prev, timeOffsetMs: 0 }))
  }, [clearNotes, setViewState])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllNotes()
    }
  }, [stopAllNotes])
  
  // Safe getCycleInfo wrapper
  const getCycleInfoSafe = useCallback(() => {
    return getCycleInfo?.() || null
  }, [getCycleInfo])
  
  const value: SequencerContextValue = {
    // Notes
    notes,
    createNote,
    createNotes,
    updateNote,
    deleteNote,
    deleteNotes,
    clearNotes,
    startBatchUpdate,
    endBatchUpdate,
    
    // Undo/redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Selection
    selectedNoteIds,
    setSelectedNoteIds,
    selectAll,
    clearSelection,
    
    // Clipboard
    clipboardNotes,
    copy,
    paste,
    cut,
    
    // Mode
    mode,
    setMode,
    
    // Cursor
    cursorPositionMs,
    setCursorPositionMs,
    
    // View state
    viewState,
    updateViewState,
    
    // Grid settings
    quantizeValue,
    setQuantizeValue,
    cycleCount,
    setCycleCount,
    
    // Strudel
    getCycleInfo: getCycleInfoSafe,
    cycleDurationMs,
    isPlaying: isStrudelPlaying,
    playbackPositionMs,
    
    // Actions
    sendToPrompt,
    handleClear,
    
    // Audio preview
    playDrum
  }
  
  return (
    <SequencerContext.Provider value={value}>
      {children}
    </SequencerContext.Provider>
  )
}

// Hook to use the context
export const useSequencerContext = () => {
  const context = useContext(SequencerContext)
  if (!context) {
    throw new Error('useSequencerContext must be used within a SequencerProvider')
  }
  return context
}

