import { useState, useCallback, useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react'
import {
  SequencerNote,
  SequencerMode,
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
import { NoteHit } from './useGridCoordinates'
import { DrawingState } from './useGridRenderer'
import { InteractionUtilsReturn } from './useInteractionUtils'

// Touch interaction state
export interface TouchState {
  touchId: number
  startPos: { x: number; y: number }
  startTime: number
  currentPos: { x: number; y: number }
  interactionType: 'none' | 'tap' | 'draw' | 'resize' | 'move' | 'pinch' | 'scroll'
  hitNote: SequencerNote | null
  hitEdge: 'left' | 'right' | 'body' | null
  longPressTriggered: boolean
  // For scroll mode: store initial view state when scroll starts
  initialMidiOffset?: number
  initialTimeOffsetMs?: number
  // For velocity tracking (fast swipe detection)
  lastMoveTime?: number
  lastMovePos?: { x: number; y: number }
}

// Pinch state for two-finger zoom
export interface PinchState {
  initialDistance: number
  initialCenter: { x: number; y: number }
  initialTimeOffsetMs: number
  initialVisibleDurationMs: number
  initialMidiOffset: number
  initialVisibleSemitones: number
}

// Long press duration in ms
const LONG_PRESS_DURATION = 400

interface UseTouchInteractionsOptions {
  // Refs
  canvasRef: RefObject<HTMLCanvasElement>
  
  // State
  notes: SequencerNote[]
  mode: SequencerMode
  
  // View state
  viewState: SequencerViewState
  updateViewState: (updates: Partial<SequencerViewState>) => void
  cycleCount: number
  midiOffset: number
  
  // Shared drawing state (from parent hook)
  drawingState: DrawingState | null
  setDrawingState: Dispatch<SetStateAction<DrawingState | null>>
  
  // Selection
  setSelectedNoteIds: (ids: Set<string>) => void
  
  // Note operations
  createNote: (noteData: Omit<SequencerNote, 'id'>) => void
  updateNote: (id: string, updates: Partial<Omit<SequencerNote, 'id'>>) => void
  deleteNote: (id: string) => void
  startBatchUpdate: () => void
  endBatchUpdate: () => void
  
  // Coordinate helpers
  pixelsPerMs: number
  getTouchPosOnCanvas: (touch: { clientX: number; clientY: number }) => { x: number; y: number }
  findNoteAtPosition: (x: number, y: number, notes: SequencerNote[], isTouch?: boolean) => NoteHit | null
  
  // Strudel integration
  getCycleInfo: () => CycleInfo | null
  
  // Shared utilities
  utils: InteractionUtilsReturn
}

// Touch events are now attached via native event listeners with { passive: false }
// so we don't need to return handlers for React event props
interface UseTouchInteractionsReturn {
  // No-op handlers for backwards compatibility (events are handled internally)
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void
  handleTouchCancel: (e: React.TouchEvent) => void
}

export const useTouchInteractions = ({
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
}: UseTouchInteractionsOptions): UseTouchInteractionsReturn => {
  const { timeOffsetMs, visibleDurationMs, visibleSemitones } = viewState
  
  // Touch states
  const [touchState, setTouchState] = useState<TouchState | null>(null)
  const [pinchState, setPinchState] = useState<PinchState | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  
  // Helper: Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])
  
  // Touch start handler (native event)
  const handleTouchStartNative = useCallback((e: TouchEvent) => {
    // Handle pinch (two fingers)
    if (e.touches.length === 2) {
      e.preventDefault()
      clearLongPressTimer()
      setTouchState(null)
      setDrawingState(null)
      
      const touch1 = getTouchPosOnCanvas(e.touches[0])
      const touch2 = getTouchPosOnCanvas(e.touches[1])
      
      const distance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      )
      const center = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2
      }
      
      setPinchState({
        initialDistance: distance,
        initialCenter: center,
        initialTimeOffsetMs: timeOffsetMs,
        initialVisibleDurationMs: visibleDurationMs,
        initialMidiOffset: midiOffset,
        initialVisibleSemitones: visibleSemitones
      })
      return
    }
    
    // Single finger touch
    if (e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      const pos = getTouchPosOnCanvas(touch)
      const hit = findNoteAtPosition(pos.x, pos.y, notes, true)
      
      const newTouchState: TouchState = {
        touchId: touch.identifier,
        startPos: pos,
        startTime: Date.now(),
        currentPos: pos,
        interactionType: 'none',
        hitNote: hit?.note || null,
        hitEdge: hit?.edge || null,
        longPressTriggered: false
      }
      
      setTouchState(newTouchState)
      
      // If we hit a note edge, prepare for resize immediately (no long press needed)
      if (hit && (hit.edge === 'left' || hit.edge === 'right')) {
        // Resize will be detected in touchmove when movement exceeds threshold
      } else if (hit && hit.edge === 'body') {
        // Start long press timer for move
        clearLongPressTimer()
        longPressTimerRef.current = window.setTimeout(() => {
          setTouchState(prev => {
            if (prev && prev.hitNote && !prev.longPressTriggered) {
              // Long press triggered - enter move mode
              startBatchUpdate()
              return { ...prev, interactionType: 'move', longPressTriggered: true }
            }
            return prev
          })
        }, LONG_PRESS_DURATION)
      } else {
        // Empty area - will determine scroll vs draw in touchmove based on direction
        // Don't set drawingState yet - wait to see if user drags horizontally or vertically
      }
    }
  }, [getTouchPosOnCanvas, findNoteAtPosition, notes, clearLongPressTimer, startBatchUpdate, utils, setDrawingState, timeOffsetMs, visibleDurationMs, midiOffset, visibleSemitones])
  
  // Touch move handler (native event)
  const handleTouchMoveNative = useCallback((e: TouchEvent) => {
    // Handle pinch zoom
    if (pinchState && e.touches.length === 2) {
      e.preventDefault()
      
      const touch1 = getTouchPosOnCanvas(e.touches[0])
      const touch2 = getTouchPosOnCanvas(e.touches[1])
      
      const newDistance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      )
      
      // Calculate zoom factor
      const zoomFactor = pinchState.initialDistance / newDistance
      
      // Determine pinch direction (horizontal vs vertical)
      const dx = Math.abs(touch2.x - touch1.x)
      const dy = Math.abs(touch2.y - touch1.y)
      
      const cycleDurationMs = DEFAULT_CYCLE_DURATION_MS
      const maxTimeMs = cycleCount * cycleDurationMs
      
      if (dx > dy * 1.5) {
        // Horizontal pinch - zoom time axis
        const newDuration = Math.max(
          MIN_VISIBLE_DURATION_CYCLES * cycleDurationMs,
          Math.min(
            cycleCount * cycleDurationMs,
            pinchState.initialVisibleDurationMs * zoomFactor
          )
        )
        
        // Calculate new offset to keep center point stable
        const centerTimeMs = pinchState.initialTimeOffsetMs + 
          (pinchState.initialCenter.x / pixelsPerMs)
        const newPixelsPerMs = (canvasRef.current?.width || 480) / newDuration
        const newOffset = Math.max(0, Math.min(
          maxTimeMs - newDuration,
          centerTimeMs - (pinchState.initialCenter.x / newPixelsPerMs)
        ))
        
        updateViewState({
          visibleDurationMs: newDuration,
          timeOffsetMs: newOffset
        })
      } else if (dy > dx * 1.5 && mode === 'notes') {
        // Vertical pinch - zoom pitch axis (notes mode only)
        const newSemitones = Math.round(Math.max(
          MIN_VISIBLE_SEMITONES,
          Math.min(MAX_VISIBLE_SEMITONES, pinchState.initialVisibleSemitones * zoomFactor)
        ))
        
        const canvas = canvasRef.current
        const canvasHeight = canvas?.height || 200
        const centerRow = (canvasHeight - pinchState.initialCenter.y) / (canvasHeight / pinchState.initialVisibleSemitones)
        const centerMidi = pinchState.initialMidiOffset + centerRow
        
        const newOffset = Math.max(
          PIANO_MIDI_MIN,
          Math.min(
            PIANO_MIDI_MAX - newSemitones,
            Math.round(centerMidi - (centerRow / pinchState.initialVisibleSemitones * newSemitones))
          )
        )
        
        updateViewState({
          visibleSemitones: newSemitones,
          midiOffset: newOffset
        })
      } else {
        // Diagonal pinch - zoom both axes proportionally
        const newDuration = Math.max(
          MIN_VISIBLE_DURATION_CYCLES * cycleDurationMs,
          Math.min(
            cycleCount * cycleDurationMs,
            pinchState.initialVisibleDurationMs * zoomFactor
          )
        )
        
        const centerTimeMs = pinchState.initialTimeOffsetMs + 
          (pinchState.initialCenter.x / pixelsPerMs)
        const newPixelsPerMs = (canvasRef.current?.width || 480) / newDuration
        const newTimeOffset = Math.max(0, Math.min(
          maxTimeMs - newDuration,
          centerTimeMs - (pinchState.initialCenter.x / newPixelsPerMs)
        ))
        
        if (mode === 'notes') {
          const newSemitones = Math.round(Math.max(
            MIN_VISIBLE_SEMITONES,
            Math.min(MAX_VISIBLE_SEMITONES, pinchState.initialVisibleSemitones * zoomFactor)
          ))
          
          updateViewState({
            visibleDurationMs: newDuration,
            timeOffsetMs: newTimeOffset,
            visibleSemitones: newSemitones
          })
        } else {
          updateViewState({
            visibleDurationMs: newDuration,
            timeOffsetMs: newTimeOffset
          })
        }
      }
      return
    }
    
    // Handle single finger move
    if (touchState && e.touches.length === 1) {
      const touch = Array.from(e.touches).find(t => t.identifier === touchState.touchId)
      if (!touch) return
      
      e.preventDefault()
      const pos = getTouchPosOnCanvas(touch)
      const distance = Math.sqrt(
        Math.pow(pos.x - touchState.startPos.x, 2) + 
        Math.pow(pos.y - touchState.startPos.y, 2)
      )
      
      const tapThreshold = utils.getTapThreshold()
      
      setTouchState(prev => prev ? { ...prev, currentPos: pos } : null)
      
      // If we've moved beyond tap threshold, determine interaction type
      if (distance > tapThreshold) {
        clearLongPressTimer()
        
        if (touchState.hitNote && touchState.hitEdge && (touchState.hitEdge === 'left' || touchState.hitEdge === 'right')) {
          // Resize mode - dragging from note edge
          if (touchState.interactionType !== 'resize') {
            startBatchUpdate()
            setTouchState(prev => prev ? { ...prev, interactionType: 'resize' } : null)
          }
          
          // Perform resize (now using slots)
          const { deltaSlots } = utils.calculateMoveDelta(touchState.startPos, pos)
          
          if (touchState.hitEdge === 'left') {
            const newStartSlot = utils.calculateResizeStart(touchState.hitNote, deltaSlots)
            updateNote(touchState.hitNote.id, { startSlot: newStartSlot })
          } else {
            const newEndSlot = utils.calculateResizeEnd(touchState.hitNote, deltaSlots)
            updateNote(touchState.hitNote.id, { endSlot: newEndSlot })
          }
        } else if (touchState.interactionType === 'move' && touchState.hitNote) {
          // Move mode - long press was triggered, now dragging (now using slots)
          const { deltaSlots, deltaRow } = utils.calculateMoveDelta(touchState.startPos, pos)
          const updates = utils.applyMoveToNote(touchState.hitNote, deltaSlots, deltaRow)
          updateNote(touchState.hitNote.id, updates)
        } else if (touchState.interactionType === 'scroll') {
          // Scroll mode - pan the view
          const canvas = canvasRef.current
          if (!canvas) return
          
          const deltaY = pos.y - touchState.startPos.y
          const deltaX = pos.x - touchState.startPos.x
          const laneHeight = canvas.height / visibleSemitones
          
          // Calculate semitone delta from vertical movement
          // Dragging down (positive deltaY) should show higher notes (increase midiOffset)
          const semitoneDelta = Math.round(deltaY / laneHeight)
          
          // Calculate time delta from horizontal movement  
          // Dragging right (positive deltaX) should show earlier time (decrease timeOffsetMs)
          const timeDeltaMs = -deltaX / pixelsPerMs
          
          const cycleDurationMs = DEFAULT_CYCLE_DURATION_MS
          const maxTimeMs = cycleCount * cycleDurationMs
          
          const newMidiOffset = Math.max(
            PIANO_MIDI_MIN,
            Math.min(PIANO_MIDI_MAX - visibleSemitones, (touchState.initialMidiOffset || midiOffset) + semitoneDelta)
          )
          
          const newTimeOffsetMs = Math.max(
            0,
            Math.min(maxTimeMs - visibleDurationMs, (touchState.initialTimeOffsetMs || timeOffsetMs) + timeDeltaMs)
          )
          
          updateViewState({ midiOffset: newMidiOffset, timeOffsetMs: newTimeOffsetMs })
        } else if (!touchState.hitNote && touchState.interactionType === 'none') {
          // Empty area, first movement - determine scroll vs draw based on direction and velocity
          const deltaX = Math.abs(pos.x - touchState.startPos.x)
          const deltaY = Math.abs(pos.y - touchState.startPos.y)
          
          // Calculate horizontal velocity to detect fast swipes
          const now = Date.now()
          const timeSinceStart = now - touchState.startTime
          const horizontalVelocity = timeSinceStart > 0 ? deltaX / timeSinceStart : 0  // pixels per ms
          
          // Fast horizontal swipe threshold: 0.1 pixels/ms (100 pixels/second)
          // Low threshold means drawing long notes requires slow, deliberate drags (almost tap + slow extend)
          const fastSwipeThreshold = 0.1
          const isFastHorizontalSwipe = horizontalVelocity > fastSwipeThreshold && deltaX > deltaY
          
          if (deltaY > deltaX * 0.7 || isFastHorizontalSwipe) {
            // Primarily vertical movement OR fast horizontal swipe - enter scroll mode
            setTouchState(prev => prev ? { 
              ...prev, 
              interactionType: 'scroll',
              initialMidiOffset: midiOffset,
              initialTimeOffsetMs: timeOffsetMs
            } : null)
          } else {
            // Slow horizontal movement - enter draw mode
            const newDrawingState = utils.getDrawingStateForPosition(touchState.startPos)
            if (newDrawingState) {
              setDrawingState(newDrawingState)
              setTouchState(prev => prev ? { ...prev, interactionType: 'draw' } : null)
            }
          }
        } else if (!touchState.hitNote && drawingState && touchState.interactionType === 'draw') {
          // Draw mode - continue drawing (now using slots)
          const slotsPerSubdiv = utils.getSlotsPerSubdiv()
          // Calculate new end slot from touch position using dynamic cycle duration
          const cycleDurationMs = getCycleInfo()?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
          const rawSlot = utils.snapToSlot(
            Math.round((pos.x / pixelsPerMs + viewState.timeOffsetMs) / cycleDurationMs * BASE_SLOTS_PER_CYCLE)
          )
          const newEndSlot = Math.max(drawingState.startSlot + slotsPerSubdiv, rawSlot)
          
          setDrawingState(prev => prev ? { ...prev, currentEndSlot: newEndSlot } : null)
        }
      }
    }
  }, [pinchState, touchState, getTouchPosOnCanvas, utils, clearLongPressTimer, pixelsPerMs, updateNote, updateViewState, mode, cycleCount, startBatchUpdate, canvasRef, drawingState, setDrawingState, viewState.timeOffsetMs, visibleSemitones, midiOffset, timeOffsetMs, visibleDurationMs])
  
  // Touch end handler (native event)
  const handleTouchEndNative = useCallback((e: TouchEvent) => {
    // Prevent synthesized mouse events on touchscreen PCs
    e.preventDefault()
    
    // Clear any pending long press
    clearLongPressTimer()
    
    // Handle pinch end
    if (pinchState) {
      if (e.touches.length === 0) {
        setPinchState(null)
      }
      return
    }
    
    if (!touchState) {
      setDrawingState(null)
      return
    }
    
    try {
      const pos = touchState.currentPos
      const distance = Math.sqrt(
        Math.pow(pos.x - touchState.startPos.x, 2) + 
        Math.pow(pos.y - touchState.startPos.y, 2)
      )
      
      const tapThreshold = utils.getTapThreshold()
      const isTap = distance < tapThreshold && (Date.now() - touchState.startTime) < 300
      
      if (isTap) {
        // Tap action
        if (touchState.hitNote) {
          // Tap on note - delete it (toggle off)
          // Ensure batch mode is off so each delete gets its own history entry
          endBatchUpdate()
          deleteNote(touchState.hitNote.id)
          setSelectedNoteIds(new Set())
        } else if (!touchState.hitNote) {
          // Tap on empty - create note (one quantize slot)
          const newDrawingState = utils.getDrawingStateForPosition(touchState.startPos)
          if (newDrawingState) {
            utils.createNoteFromDrawingState(newDrawingState, createNote)
          }
        }
      } else if (touchState.interactionType === 'draw' && drawingState) {
        // Finish drawing
        utils.createNoteFromDrawingState(drawingState, createNote)
      }
      // Scroll mode ends silently - no action needed
    } finally {
      // Always end batch update if we were in move/resize mode
      if (touchState.interactionType === 'move' || touchState.interactionType === 'resize') {
        endBatchUpdate()
      }
      
      // Reset states
      setTouchState(null)
      setDrawingState(null)
    }
  }, [touchState, pinchState, drawingState, clearLongPressTimer, utils, deleteNote, setSelectedNoteIds, createNote, endBatchUpdate, setDrawingState])
  
  // Touch cancel handler (native event)
  const handleTouchCancelNative = useCallback((e: TouchEvent) => {
    // Prevent synthesized mouse events on touchscreen PCs
    e.preventDefault()
    
    try {
      clearLongPressTimer()
    } finally {
      // Always end batch update if we were in move/resize mode
      if (touchState?.interactionType === 'move' || touchState?.interactionType === 'resize') {
        endBatchUpdate()
      }
      
      setTouchState(null)
      setPinchState(null)
      setDrawingState(null)
    }
  }, [clearLongPressTimer, touchState, endBatchUpdate, setDrawingState])
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])
  
  // Attach native touch event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.addEventListener('touchstart', handleTouchStartNative, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMoveNative, { passive: false })
    canvas.addEventListener('touchend', handleTouchEndNative, { passive: false })
    canvas.addEventListener('touchcancel', handleTouchCancelNative, { passive: false })
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStartNative)
      canvas.removeEventListener('touchmove', handleTouchMoveNative)
      canvas.removeEventListener('touchend', handleTouchEndNative)
      canvas.removeEventListener('touchcancel', handleTouchCancelNative)
    }
  }, [canvasRef, handleTouchStartNative, handleTouchMoveNative, handleTouchEndNative, handleTouchCancelNative])
  
  // Return no-op handlers for backwards compatibility
  // (touch events are now handled via native event listeners attached above)
  const noOpHandler = useCallback(() => {}, [])
  
  return {
    handleTouchStart: noOpHandler,
    handleTouchMove: noOpHandler,
    handleTouchEnd: noOpHandler,
    handleTouchCancel: noOpHandler
  }
}

