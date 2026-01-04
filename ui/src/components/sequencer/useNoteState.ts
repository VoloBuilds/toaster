import { useState, useCallback, useRef, useEffect } from 'react'
import { SequencerNote, SequencerMode } from '../../lib/sequencer/types'

interface UseNoteStateOptions {
  mode: SequencerMode
  maxHistorySize?: number
}

interface UseNoteStateReturn {
  notes: SequencerNote[]
  createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  createNotes: (notesData: Omit<SequencerNote, 'id'>[]) => void
  updateNote: (id: string, updates: Partial<Omit<SequencerNote, 'id'>>) => void
  deleteNote: (id: string) => void
  deleteNotes: (ids: string[]) => void
  clearNotes: () => void
  // Batch operations that save history once at start
  startBatchUpdate: () => void
  endBatchUpdate: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  // Scale all notes by a ratio (for BPM changes)
  scaleAllNotes: (ratio: number) => void
}

let noteIdCounter = 0
const generateNoteId = () => `note-${Date.now()}-${++noteIdCounter}`

// In-memory store for notes (persists across mode switches, clears on refresh)
const inMemoryNoteStore: Record<SequencerMode, SequencerNote[]> = {
  piano: [],
  drum: []
}

const loadNotesFromMemory = (mode: SequencerMode): SequencerNote[] => {
  return inMemoryNoteStore[mode]
}

const saveNotesToMemory = (mode: SequencerMode, notes: SequencerNote[]) => {
  inMemoryNoteStore[mode] = notes
}

export const useNoteState = (options: UseNoteStateOptions): UseNoteStateReturn => {
  const { mode, maxHistorySize = 50 } = options
  
  // Initialize notes from in-memory store for current mode
  const [notes, setNotes] = useState<SequencerNote[]>(() => loadNotesFromMemory(mode))
  
  // Keep a ref to current notes for synchronous access (needed for undo/redo)
  const notesRef = useRef<SequencerNote[]>(notes)
  notesRef.current = notes
  
  // Track current mode to detect changes
  const currentModeRef = useRef(mode)
  
  // Undo/redo history (per session, not persisted)
  const historyRef = useRef<SequencerNote[][]>([])
  const futureRef = useRef<SequencerNote[][]>([])
  // Used to trigger re-render when history changes
  const [, setHistoryVersion] = useState(0)
  
  // Batch update tracking - when in batch mode, history is saved once at start
  const batchModeRef = useRef<boolean>(false)
  const batchHistorySavedRef = useRef<boolean>(false)
  
  // When mode changes, save current notes and load notes for new mode
  useEffect(() => {
    if (mode !== currentModeRef.current) {
      // Save current notes for the OLD mode before switching
      saveNotesToMemory(currentModeRef.current, notes)
      
      // Load notes for the new mode
      const newModeNotes = loadNotesFromMemory(mode)
      setNotes(newModeNotes)
      
      // Clear undo/redo history when switching modes
      historyRef.current = []
      futureRef.current = []
      setHistoryVersion(v => v + 1)
      
      // Update mode ref
      currentModeRef.current = mode
    }
  }, [mode, notes])
  
  // Save notes to in-memory store whenever they change
  useEffect(() => {
    saveNotesToMemory(mode, notes)
  }, [notes, mode])
  
  // Save current state to history before making changes
  // This modifies refs, so it should be called OUTSIDE of setState callbacks
  const saveToHistory = useCallback((currentNotes: SequencerNote[]) => {
    // If in batch mode and we already saved, skip
    if (batchModeRef.current && batchHistorySavedRef.current) {
      return
    }
    
    historyRef.current = [...historyRef.current, currentNotes].slice(-maxHistorySize)
    futureRef.current = []
    setHistoryVersion(v => v + 1)
    
    // Mark that we saved during this batch
    if (batchModeRef.current) {
      batchHistorySavedRef.current = true
    }
  }, [maxHistorySize])
  
  // Start a batch update - history will only be saved once
  const startBatchUpdate = useCallback(() => {
    batchModeRef.current = true
    batchHistorySavedRef.current = false
  }, [])
  
  // End a batch update
  const endBatchUpdate = useCallback(() => {
    batchModeRef.current = false
    batchHistorySavedRef.current = false
  }, [])
  
  // Create a single note
  const createNote = useCallback((noteData: Omit<SequencerNote, 'id'>) => {
    // Save history BEFORE modifying state (uses ref for current notes)
    saveToHistory(notesRef.current)
    
    const newNote: SequencerNote = {
      id: generateNoteId(),
      ...noteData
    }
    setNotes(prev => [...prev, newNote])
  }, [saveToHistory])
  
  // Create multiple notes at once (for paste operation)
  const createNotes = useCallback((notesData: Omit<SequencerNote, 'id'>[]) => {
    if (notesData.length === 0) return
    
    // Save history BEFORE modifying state
    saveToHistory(notesRef.current)
    
    const newNotes: SequencerNote[] = notesData.map(data => {
      // Defensively remove any existing id to ensure we always generate new ones
      const { id: _existingId, ...dataWithoutId } = data as SequencerNote
      return {
        ...dataWithoutId,
        id: generateNoteId()
      }
    })
    setNotes(prev => [...prev, ...newNotes])
  }, [saveToHistory])
  
  // Update a note
  const updateNote = useCallback((id: string, updates: Partial<Omit<SequencerNote, 'id'>>) => {
    // Check if note exists before saving history
    const noteExists = notesRef.current.some(n => n.id === id)
    if (!noteExists) return
    
    saveToHistory(notesRef.current)
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ))
  }, [saveToHistory])
  
  // Delete a single note
  const deleteNote = useCallback((id: string) => {
    // Check if note exists before saving history
    const noteExists = notesRef.current.some(n => n.id === id)
    if (!noteExists) return
    
    saveToHistory(notesRef.current)
    setNotes(prev => prev.filter(note => note.id !== id))
  }, [saveToHistory])
  
  // Delete multiple notes
  const deleteNotes = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    
    const idSet = new Set(ids)
    const hasAny = notesRef.current.some(n => idSet.has(n.id))
    if (!hasAny) return
    
    saveToHistory(notesRef.current)
    setNotes(prev => prev.filter(note => !idSet.has(note.id)))
  }, [saveToHistory])
  
  // Clear all notes
  const clearNotes = useCallback(() => {
    if (notesRef.current.length === 0) return
    
    saveToHistory(notesRef.current)
    setNotes([])
  }, [saveToHistory])
  
  // Undo last action
  // All ref modifications happen BEFORE setNotes to avoid React double-invoke issues
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    
    // Capture current state and history BEFORE any modifications
    const currentNotes = notesRef.current
    const previousState = historyRef.current[historyRef.current.length - 1]
    
    // Update refs atomically OUTSIDE of setState
    futureRef.current = [...futureRef.current, currentNotes]
    historyRef.current = historyRef.current.slice(0, -1)
    setHistoryVersion(v => v + 1)
    
    // Set the new notes state
    setNotes(previousState)
  }, [])
  
  // Redo undone action
  // All ref modifications happen BEFORE setNotes to avoid React double-invoke issues
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    
    // Capture current state and future BEFORE any modifications
    const currentNotes = notesRef.current
    const nextState = futureRef.current[futureRef.current.length - 1]
    
    // Update refs atomically OUTSIDE of setState
    historyRef.current = [...historyRef.current, currentNotes]
    futureRef.current = futureRef.current.slice(0, -1)
    setHistoryVersion(v => v + 1)
    
    // Set the new notes state
    setNotes(nextState)
  }, [])
  
  // Scale all notes by a ratio (for BPM changes)
  // This scales notes in BOTH modes to maintain relative positions
  // Does NOT save to history since it's a temporal transformation
  const scaleAllNotes = useCallback((ratio: number) => {
    if (ratio === 1) return
    
    const scaleNote = (note: SequencerNote): SequencerNote => ({
      ...note,
      startMs: note.startMs * ratio,
      endMs: note.endMs * ratio
    })
    
    // Scale current mode notes
    setNotes(prev => prev.map(scaleNote))
    
    // Scale the OTHER mode's notes in in-memory store
    const otherMode = mode === 'piano' ? 'drum' : 'piano'
    const otherNotes = inMemoryNoteStore[otherMode]
    if (otherNotes.length > 0) {
      inMemoryNoteStore[otherMode] = otherNotes.map(scaleNote)
    }
  }, [mode])
  
  return {
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
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    scaleAllNotes
  }
}
