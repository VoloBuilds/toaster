import { useState, useCallback, useEffect, RefObject } from 'react'
import {
  SequencerNote,
  SequencerMode,
  QuantizeValue,
  CycleInfo,
  DrumSound,
  DEFAULT_CYCLE_DURATION_MS,
  PIANO_MIDI_MIN,
  PIANO_MIDI_MAX,
  MIN_VISIBLE_SEMITONES,
  MAX_VISIBLE_SEMITONES,
  MIN_VISIBLE_DURATION_CYCLES,
  SequencerViewState
} from '../../../lib/sequencer/types'
import { NoteHit } from './useGridCoordinates'
import { DrawingState, BoxSelectState } from './useGridRenderer'
import { useInteractionUtils } from './useInteractionUtils'
import { useTouchInteractions, TouchState, PinchState } from './useTouchInteractions'

// Re-export touch types for external use
export type { TouchState, PinchState }

// Drag state type
export interface DragState {
  type: 'move' | 'resize-left' | 'resize-right' | 'group-move'
  startX: number
  startY: number
  currentX: number
  currentY: number
  originalNotes: SequencerNote[]
  copying: boolean
}

interface UseGridInteractionsOptions {
  // Refs
  containerRef: RefObject<HTMLDivElement>
  canvasRef: RefObject<HTMLCanvasElement>
  
  // State
  notes: SequencerNote[]
  mode: SequencerMode
  quantizeValue: QuantizeValue
  cycleCount: number
  midiOffset: number
  
  // View state
  viewState: SequencerViewState
  updateViewState: (updates: Partial<SequencerViewState>) => void
  
  // Selection
  selectedNoteIds: Set<string>
  setSelectedNoteIds: (ids: Set<string>) => void
  
  // Cursor
  cursorPositionMs: number
  setCursorPositionMs: (ms: number) => void
  
  // Note operations
  createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  createNotes: (notesData: Omit<SequencerNote, 'id'>[]) => void
  updateNote: (id: string, updates: Partial<Omit<SequencerNote, 'id'>>) => void
  deleteNote: (id: string) => void
  deleteNotes: (ids: string[]) => void
  startBatchUpdate: () => void
  endBatchUpdate: () => void
  
  // Strudel
  getCycleInfo: () => CycleInfo | null
  
  // Audio preview
  playDrum: (drumSound: DrumSound) => void
  
  // Coordinate helpers
  laneHeight: number
  pixelsPerMs: number
  getMousePosOnCanvas: (e: MouseEvent | React.MouseEvent) => { x: number; y: number }
  getTouchPosOnCanvas: (touch: { clientX: number; clientY: number }) => { x: number; y: number }
  xToTimeMs: (x: number) => number
  yToRow: (y: number) => number
  findNoteAtPosition: (x: number, y: number, notes: SequencerNote[], isTouch?: boolean) => NoteHit | null
  findNotesInRect: (x1: number, y1: number, x2: number, y2: number, notes: SequencerNote[]) => SequencerNote[]
}

interface UseGridInteractionsReturn {
  // Interaction state (for rendering)
  dragState: DragState | null
  drawingState: DrawingState | null
  boxSelectState: BoxSelectState | null
  copyPreviewNotes: Omit<SequencerNote, 'id'>[]
  hoveredNoteId: string | null
  cursorStyle: string
  
  // Mouse event handlers
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: () => void
  handleMouseLeave: () => void
  
  // Touch event handlers
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void
  handleTouchCancel: (e: React.TouchEvent) => void
}

export const useGridInteractions = ({
  containerRef,
  canvasRef,
  notes,
  mode,
  quantizeValue,
  cycleCount,
  midiOffset,
  viewState,
  updateViewState,
  selectedNoteIds,
  setSelectedNoteIds,
  cursorPositionMs,
  setCursorPositionMs,
  createNote,
  createNotes,
  updateNote,
  deleteNote,
  deleteNotes,
  startBatchUpdate,
  endBatchUpdate,
  getCycleInfo,
  playDrum,
  laneHeight,
  pixelsPerMs,
  getMousePosOnCanvas,
  getTouchPosOnCanvas,
  xToTimeMs,
  yToRow,
  findNoteAtPosition,
  findNotesInRect
}: UseGridInteractionsOptions): UseGridInteractionsReturn => {
  const { timeOffsetMs, visibleDurationMs, visibleSemitones } = viewState
  
  // Interaction states
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null)
  const [boxSelectState, setBoxSelectState] = useState<BoxSelectState | null>(null)
  const [copyPreviewNotes, setCopyPreviewNotes] = useState<Omit<SequencerNote, 'id'>[]>([])
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')
  
  // Shared interaction utilities
  const utils = useInteractionUtils({
    mode,
    midiOffset,
    quantizeValue,
    pixelsPerMs,
    laneHeight,
    getCycleInfo,
    xToTimeMs,
    yToRow
  })
  
  // Touch interactions (composed hook)
  const touchInteractions = useTouchInteractions({
    canvasRef,
    notes,
    mode,
    viewState,
    updateViewState,
    cycleCount,
    midiOffset,
    drawingState,
    setDrawingState,
    setSelectedNoteIds,
    createNote,
    updateNote,
    deleteNote,
    startBatchUpdate,
    endBatchUpdate,
    playDrum,
    pixelsPerMs,
    getTouchPosOnCanvas,
    findNoteAtPosition,
    utils
  })
  
  // ==========================================
  // Wheel Handler for Zoom/Pan
  // ==========================================
  
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    const cycleInfo = getCycleInfo()
    const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    const maxTimeMs = cycleCount * cycleDurationMs
    
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const mouseX = rect ? (e.clientX - rect.left) / rect.width : 0.5
    const mouseY = rect ? (e.clientY - rect.top) / rect.height : 0.5
    
    const isCtrlOrCmd = e.ctrlKey || e.metaKey
    const isAlt = e.altKey
    const isShift = e.shiftKey
    
    const delta = Math.sign(e.deltaY)
    
    if (isCtrlOrCmd) {
      // Horizontal zoom
      const zoomFactor = delta > 0 ? 1.15 : 0.87
      const newDuration = Math.max(
        MIN_VISIBLE_DURATION_CYCLES * cycleDurationMs,
        Math.min(cycleCount * cycleDurationMs, visibleDurationMs * zoomFactor)
      )
      
      const mouseTimeMs = timeOffsetMs + (mouseX * visibleDurationMs)
      const newOffset = Math.max(0, Math.min(maxTimeMs - newDuration, mouseTimeMs - (mouseX * newDuration)))
      
      updateViewState({ visibleDurationMs: newDuration, timeOffsetMs: newOffset })
      
    } else if (isAlt && mode === 'piano') {
      // Vertical zoom (piano mode only)
      const zoomFactor = delta > 0 ? 1.2 : 0.83
      const newSemitones = Math.round(Math.max(
        MIN_VISIBLE_SEMITONES,
        Math.min(MAX_VISIBLE_SEMITONES, visibleSemitones * zoomFactor)
      ))
      
      const mouseMidi = midiOffset + ((1 - mouseY) * visibleSemitones)
      const newOffset = Math.max(
        PIANO_MIDI_MIN,
        Math.min(PIANO_MIDI_MAX - newSemitones, Math.round(mouseMidi - ((1 - mouseY) * newSemitones)))
      )
      
      updateViewState({ visibleSemitones: newSemitones, midiOffset: newOffset })
      
    } else if (isShift && mode === 'piano') {
      // Vertical scroll (piano mode only)
      const scrollAmount = delta * Math.max(1, Math.floor(visibleSemitones / 12))
      const newOffset = Math.max(
        PIANO_MIDI_MIN,
        Math.min(PIANO_MIDI_MAX - visibleSemitones, midiOffset + scrollAmount)
      )
      updateViewState({ midiOffset: newOffset })
      
    } else {
      // Horizontal scroll
      const scrollAmount = delta * (visibleDurationMs * 0.1)
      const newOffset = Math.max(0, Math.min(maxTimeMs - visibleDurationMs, timeOffsetMs + scrollAmount))
      updateViewState({ timeOffsetMs: newOffset })
    }
  }, [getCycleInfo, cycleCount, visibleDurationMs, timeOffsetMs, visibleSemitones, midiOffset, mode, updateViewState, canvasRef])
  
  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel, containerRef])
  
  // ==========================================
  // Mouse Handlers
  // ==========================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosOnCanvas(e)
    const hit = findNoteAtPosition(pos.x, pos.y, notes)
    const isShift = e.shiftKey
    const isCtrl = e.ctrlKey || e.metaKey
    
    if (hit) {
      const noteId = hit.note.id
      const isAlreadySelected = selectedNoteIds.has(noteId)
      
      if (isShift) {
        // Toggle selection
        const newSelection = new Set(selectedNoteIds)
        if (newSelection.has(noteId)) {
          newSelection.delete(noteId)
        } else {
          newSelection.add(noteId)
        }
        setSelectedNoteIds(newSelection)
      } else if (isAlreadySelected) {
        // Start group drag
        if (!isCtrl) startBatchUpdate()
        const selectedNotesArray = notes.filter(n => selectedNoteIds.has(n.id))
        setDragState({
          type: hit.edge === 'left' ? 'resize-left' : hit.edge === 'right' ? 'resize-right' : 'group-move',
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          originalNotes: selectedNotesArray.map(n => ({ ...n })),
          copying: isCtrl
        })
      } else {
        // Select single note and start drag
        if (!isCtrl) startBatchUpdate()
        setSelectedNoteIds(new Set([noteId]))
        setDragState({
          type: hit.edge === 'left' ? 'resize-left' : hit.edge === 'right' ? 'resize-right' : 'move',
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          originalNotes: [{ ...hit.note }],
          copying: isCtrl
        })
      }
      e.preventDefault()
    } else {
      // Clicked empty area
      if (isShift) {
        // Shift+drag = box select in add mode
        setBoxSelectState({
          anchorX: pos.x,
          anchorY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          addMode: true
        })
        e.preventDefault()
      } else {
        // Start drawing new note
        setSelectedNoteIds(new Set())
        const newDrawingState = utils.getDrawingStateForPosition(pos)
        if (newDrawingState) {
          setDrawingState(newDrawingState)
          setCursorStyle('crosshair')
        }
        e.preventDefault()
      }
    }
  }, [getMousePosOnCanvas, findNoteAtPosition, notes, selectedNoteIds, setSelectedNoteIds, utils, startBatchUpdate])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosOnCanvas(e)
    
    if (boxSelectState) {
      setBoxSelectState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
    } else if (drawingState) {
      const slotDurationMs = utils.getSlotDurationMs()
      const rawTimeMs = xToTimeMs(pos.x)
      const snappedEndMs = utils.snapToGrid(rawTimeMs)
      const newEndMs = Math.max(drawingState.startMs + slotDurationMs, snappedEndMs)
      setDrawingState(prev => prev ? { ...prev, currentEndMs: newEndMs } : null)
    } else if (dragState) {
      const { deltaMs, deltaRow } = utils.calculateMoveDelta(
        { x: dragState.startX, y: dragState.startY },
        pos
      )
      
      setDragState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
      
      if (dragState.copying && (dragState.type === 'group-move' || dragState.type === 'move')) {
        // Generate copy preview - explicitly exclude id to ensure new IDs are generated
        const previewNotes: Omit<SequencerNote, 'id'>[] = dragState.originalNotes.map(originalNote => {
          const { id: _id, ...noteWithoutId } = originalNote
          const updates = utils.applyMoveToNote(originalNote, deltaMs, deltaRow)
          return { ...noteWithoutId, ...updates }
        })
        setCopyPreviewNotes(previewNotes)
      } else if (!dragState.copying) {
        setCopyPreviewNotes([])
        
        if (dragState.type === 'group-move' || dragState.type === 'move') {
          for (const originalNote of dragState.originalNotes) {
            const updates = utils.applyMoveToNote(originalNote, deltaMs, deltaRow)
            updateNote(originalNote.id, updates)
          }
        } else if (dragState.type === 'resize-left' && dragState.originalNotes.length === 1) {
          const originalNote = dragState.originalNotes[0]
          const newStartMs = utils.calculateResizeStart(originalNote, deltaMs)
          updateNote(originalNote.id, { startMs: newStartMs })
        } else if (dragState.type === 'resize-right' && dragState.originalNotes.length === 1) {
          const originalNote = dragState.originalNotes[0]
          const newEndMs = utils.calculateResizeEnd(originalNote, deltaMs)
          updateNote(originalNote.id, { endMs: newEndMs })
        }
      }
    } else {
      // Update cursor and hover
      const hit = findNoteAtPosition(pos.x, pos.y, notes)
      if (hit) {
        setHoveredNoteId(hit.note.id)
        setCursorStyle(hit.edge === 'left' || hit.edge === 'right' ? 'ew-resize' : 'move')
      } else {
        setHoveredNoteId(null)
        setCursorStyle('crosshair')
      }
    }
  }, [boxSelectState, drawingState, dragState, getMousePosOnCanvas, findNoteAtPosition, utils, updateNote, xToTimeMs, notes])
  
  const handleMouseUp = useCallback(() => {
    if (boxSelectState) {
      const selectedNotes = findNotesInRect(
        boxSelectState.anchorX, boxSelectState.anchorY,
        boxSelectState.currentX, boxSelectState.currentY,
        notes
      )
      
      if (boxSelectState.addMode) {
        const newSelection = new Set(selectedNoteIds)
        for (const note of selectedNotes) newSelection.add(note.id)
        setSelectedNoteIds(newSelection)
      } else {
        setSelectedNoteIds(new Set(selectedNotes.map(n => n.id)))
      }
      
      setBoxSelectState(null)
    } else if (drawingState) {
      utils.createNoteFromDrawingState(drawingState, createNote, playDrum)
      setCursorPositionMs(drawingState.startMs)
      setDrawingState(null)
      setCursorStyle('crosshair')
    } else if (dragState && dragState.copying && copyPreviewNotes.length > 0) {
      // Ctrl+drag copy: create the copied notes
      // Note: Ctrl+drag doesn't start batch mode (if !isCtrl in mouseDown), so no endBatchUpdate needed
      createNotes(copyPreviewNotes)
      setCopyPreviewNotes([])
    } else if (dragState) {
      // Any other drag operation (move, resize, or abandoned copy): end batch if started
      // This handles both !copying case and copying with no preview notes
      endBatchUpdate()
    }
    setDragState(null)
    setCopyPreviewNotes([])
  }, [boxSelectState, drawingState, dragState, copyPreviewNotes, findNotesInRect, notes, selectedNoteIds, setSelectedNoteIds, utils, createNote, createNotes, setCursorPositionMs, endBatchUpdate, playDrum])
  
  const handleMouseLeave = useCallback(() => {
    if (boxSelectState) {
      const selectedNotes = findNotesInRect(
        boxSelectState.anchorX, boxSelectState.anchorY,
        boxSelectState.currentX, boxSelectState.currentY,
        notes
      )
      setSelectedNoteIds(new Set(selectedNotes.map(n => n.id)))
    }
    
    if (drawingState) {
      utils.createNoteFromDrawingState(drawingState, createNote, playDrum)
      setCursorPositionMs(drawingState.startMs)
    }
    
    if (dragState && !dragState.copying) {
      endBatchUpdate()
    }
    
    setBoxSelectState(null)
    setDrawingState(null)
    setDragState(null)
    setCopyPreviewNotes([])
    setHoveredNoteId(null)
    setCursorStyle('default')
  }, [boxSelectState, drawingState, dragState, utils, createNote, findNotesInRect, setSelectedNoteIds, setCursorPositionMs, endBatchUpdate, notes, playDrum])
  
  // ==========================================
  // Keyboard Handlers
  // ==========================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      // Escape key: deselect all notes
      if (e.key === 'Escape') {
        setSelectedNoteIds(new Set())
        e.preventDefault()
        return
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIds.size > 0) {
        // Ensure batch mode is off for discrete keyboard operations
        // This prevents history entries from being merged
        endBatchUpdate()
        
        if (selectedNoteIds.size === 1) {
          deleteNote(Array.from(selectedNoteIds)[0])
        } else {
          deleteNotes(Array.from(selectedNoteIds))
        }
        setSelectedNoteIds(new Set())
        e.preventDefault()
      }
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const cycleInfo = getCycleInfo()
        const cycleDurationMs = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
        const slotDurationMs = utils.getSlotDurationMs()
        const maxTimeMs = cycleCount * cycleDurationMs
        
        const newPosition = e.key === 'ArrowLeft'
          ? Math.max(0, cursorPositionMs - slotDurationMs)
          : Math.min(maxTimeMs, cursorPositionMs + slotDurationMs)
        
        setCursorPositionMs(newPosition)
        e.preventDefault()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNoteIds, deleteNote, deleteNotes, setSelectedNoteIds, getCycleInfo, utils, cycleCount, cursorPositionMs, setCursorPositionMs, endBatchUpdate])
  
  return {
    dragState,
    drawingState,
    boxSelectState,
    copyPreviewNotes,
    hoveredNoteId,
    cursorStyle,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    ...touchInteractions
  }
}
