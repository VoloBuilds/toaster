import { useState, useCallback, useEffect, RefObject } from 'react'
import {
  SequencerNote,
  SequencerMode,
  QuantizeValue,
  CycleInfo,
  DEFAULT_CYCLE_DURATION_MS,
  PIANO_MIDI_MIN,
  PIANO_MIDI_MAX,
  MIN_VISIBLE_SEMITONES,
  MAX_VISIBLE_SEMITONES,
  MIN_VISIBLE_DURATION_CYCLES,
  SequencerViewState,
  BASE_SLOTS_PER_CYCLE
} from '../../../lib/sequencer/types'
import { slotToMs } from '../../../lib/sequencer/quantization'
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
    pixelsPerMs,
    getTouchPosOnCanvas,
    findNoteAtPosition,
    getCycleInfo,
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
      
    } else if (isAlt && mode === 'notes') {
      // Vertical zoom (notes mode only)
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
      
    } else if (isShift && mode === 'notes') {
      // Vertical scroll (notes mode only)
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
        // Shift+drag = box select (always additive)
        setBoxSelectState({
          anchorX: pos.x,
          anchorY: pos.y,
          currentX: pos.x,
          currentY: pos.y
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
      // Drawing now uses slots
      const slotsPerSubdiv = utils.getSlotsPerSubdiv()
      const rawSlot = utils.snapToSlot(
        Math.round((xToTimeMs(pos.x) / (getCycleInfo()?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS)) * BASE_SLOTS_PER_CYCLE)
      )
      const newEndSlot = Math.max(drawingState.startSlot + slotsPerSubdiv, rawSlot)
      setDrawingState(prev => prev ? { ...prev, currentEndSlot: newEndSlot } : null)
    } else if (dragState) {
      // Movement now uses slots
      const { deltaSlots, deltaRow } = utils.calculateMoveDelta(
        { x: dragState.startX, y: dragState.startY },
        pos
      )
      
      setDragState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
      
      if (dragState.copying && (dragState.type === 'group-move' || dragState.type === 'move')) {
        // Generate copy preview
        // IMPORTANT: We must explicitly destructure and exclude `id` at runtime.
        // At runtime, `originalNote` contains an `id` property from the stored note.
        // TypeScript's `Omit` only affects compile-time type checking, not runtime behavior.
        // Without explicit destructuring, spreading `noteWithoutId` would include the original `id`,
        // which would cause duplicate IDs when notes are created from the preview.
        // The explicit `{ id: _id, ...noteWithoutId }` destructure ensures `id` is truly excluded at runtime.
        const previewNotes: Omit<SequencerNote, 'id'>[] = dragState.originalNotes.map(originalNote => {
          const { id: _id, ...noteWithoutId } = originalNote
          const updates = utils.applyMoveToNote(originalNote, deltaSlots, deltaRow)
          return { ...noteWithoutId, ...updates }
        })
        setCopyPreviewNotes(previewNotes)
      } else if (!dragState.copying) {
        setCopyPreviewNotes([])
        
        if (dragState.type === 'group-move' || dragState.type === 'move') {
          for (const originalNote of dragState.originalNotes) {
            const updates = utils.applyMoveToNote(originalNote, deltaSlots, deltaRow)
            updateNote(originalNote.id, updates)
          }
        } else if (dragState.type === 'resize-left' && dragState.originalNotes.length === 1) {
          const originalNote = dragState.originalNotes[0]
          const newStartSlot = utils.calculateResizeStart(originalNote, deltaSlots)
          updateNote(originalNote.id, { startSlot: newStartSlot })
        } else if (dragState.type === 'resize-right' && dragState.originalNotes.length === 1) {
          const originalNote = dragState.originalNotes[0]
          const newEndSlot = utils.calculateResizeEnd(originalNote, deltaSlots)
          updateNote(originalNote.id, { endSlot: newEndSlot })
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
  }, [boxSelectState, drawingState, dragState, getMousePosOnCanvas, findNoteAtPosition, utils, updateNote, xToTimeMs, notes, getCycleInfo])
  
  const handleMouseUp = useCallback(() => {
    try {
      if (boxSelectState) {
        const selectedNotes = findNotesInRect(
          boxSelectState.anchorX, boxSelectState.anchorY,
          boxSelectState.currentX, boxSelectState.currentY,
          notes
        )
        
        // Box select is always additive
        const newSelection = new Set(selectedNoteIds)
        for (const note of selectedNotes) newSelection.add(note.id)
        setSelectedNoteIds(newSelection)
        
        setBoxSelectState(null)
      } else if (drawingState) {
        utils.createNoteFromDrawingState(drawingState, createNote)
        // Convert slot to ms for cursor position
        const cycleDurationMs = getCycleInfo()?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
        setCursorPositionMs(slotToMs(drawingState.startSlot, cycleDurationMs))
        setDrawingState(null)
        setCursorStyle('crosshair')
      } else if (dragState && dragState.copying && copyPreviewNotes.length > 0) {
        // Ctrl+drag copy: create the copied notes
        // Note: Ctrl+drag doesn't start batch mode (if !isCtrl in mouseDown), so no endBatchUpdate needed
        createNotes(copyPreviewNotes)
        setCopyPreviewNotes([])
      }
    } finally {
      // Always end batch update if we were in a non-copying drag operation
      if (dragState && !dragState.copying) {
        endBatchUpdate()
      }
      setDragState(null)
      setCopyPreviewNotes([])
    }
  }, [boxSelectState, drawingState, dragState, copyPreviewNotes, findNotesInRect, notes, selectedNoteIds, setSelectedNoteIds, utils, createNote, createNotes, setCursorPositionMs, endBatchUpdate, getCycleInfo])
  
  const handleMouseLeave = useCallback(() => {
    try {
      if (boxSelectState) {
        const selectedNotes = findNotesInRect(
          boxSelectState.anchorX, boxSelectState.anchorY,
          boxSelectState.currentX, boxSelectState.currentY,
          notes
        )
        
        // Box select is always additive
        const newSelection = new Set(selectedNoteIds)
        for (const note of selectedNotes) newSelection.add(note.id)
        setSelectedNoteIds(newSelection)
      }
      
      if (drawingState) {
        utils.createNoteFromDrawingState(drawingState, createNote)
        // Convert slot to ms for cursor position
        const cycleDurationMs = getCycleInfo()?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
        setCursorPositionMs(slotToMs(drawingState.startSlot, cycleDurationMs))
      }
    } finally {
      // Always end batch update if we were in a non-copying drag operation
      if (dragState && !dragState.copying) {
        endBatchUpdate()
      }
      
      setBoxSelectState(null)
      setDrawingState(null)
      setDragState(null)
      setCopyPreviewNotes([])
      setHoveredNoteId(null)
      setCursorStyle('default')
    }
  }, [boxSelectState, drawingState, dragState, utils, createNote, findNotesInRect, setSelectedNoteIds, setCursorPositionMs, endBatchUpdate, notes, getCycleInfo, selectedNoteIds])
  
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
