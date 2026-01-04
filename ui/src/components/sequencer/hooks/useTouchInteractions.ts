import { useState, useCallback, useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react'
import {
  SequencerNote,
  SequencerMode,
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
import { DrawingState } from './useGridRenderer'
import { InteractionUtilsReturn } from './useInteractionUtils'

// Touch interaction state
export interface TouchState {
  touchId: number
  startPos: { x: number; y: number }
  startTime: number
  currentPos: { x: number; y: number }
  interactionType: 'none' | 'tap' | 'draw' | 'resize' | 'move' | 'pinch'
  hitNote: SequencerNote | null
  hitEdge: 'left' | 'right' | 'body' | null
  longPressTriggered: boolean
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
  
  // Audio preview
  playDrum: (drumSound: DrumSound) => void
  
  // Coordinate helpers
  pixelsPerMs: number
  getTouchPosOnCanvas: (touch: { clientX: number; clientY: number }) => { x: number; y: number }
  findNoteAtPosition: (x: number, y: number, notes: SequencerNote[], isTouch?: boolean) => NoteHit | null
  
  // Shared utilities
  utils: InteractionUtilsReturn
}

interface UseTouchInteractionsReturn {
  // Touch event handlers
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
  playDrum,
  pixelsPerMs,
  getTouchPosOnCanvas,
  findNoteAtPosition,
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
  
  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
        // Empty area - will start drawing if dragged
        const newDrawingState = utils.getDrawingStateForPosition(pos)
        if (newDrawingState) {
          setDrawingState(newDrawingState)
        }
      }
    }
  }, [getTouchPosOnCanvas, findNoteAtPosition, notes, clearLongPressTimer, startBatchUpdate, utils, setDrawingState, timeOffsetMs, visibleDurationMs, midiOffset, visibleSemitones])
  
  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
      } else if (dy > dx * 1.5 && mode === 'piano') {
        // Vertical pinch - zoom pitch axis (piano mode only)
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
        
        if (mode === 'piano') {
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
          
          // Perform resize
          const deltaX = pos.x - touchState.startPos.x
          const deltaMs = deltaX / pixelsPerMs
          
          if (touchState.hitEdge === 'left') {
            const newStartMs = utils.calculateResizeStart(touchState.hitNote, deltaMs)
            updateNote(touchState.hitNote.id, { startMs: newStartMs })
          } else {
            const newEndMs = utils.calculateResizeEnd(touchState.hitNote, deltaMs)
            updateNote(touchState.hitNote.id, { endMs: newEndMs })
          }
        } else if (touchState.interactionType === 'move' && touchState.hitNote) {
          // Move mode - long press was triggered, now dragging
          const { deltaMs, deltaRow } = utils.calculateMoveDelta(touchState.startPos, pos)
          const updates = utils.applyMoveToNote(touchState.hitNote, deltaMs, deltaRow)
          updateNote(touchState.hitNote.id, updates)
        } else if (!touchState.hitNote && drawingState) {
          // Draw mode - dragging on empty area
          if (touchState.interactionType !== 'draw') {
            setTouchState(prev => prev ? { ...prev, interactionType: 'draw' } : null)
          }
          
          const slotDurationMs = utils.getSlotDurationMs()
          const rawTimeMs = utils.snapToGrid(pos.x / pixelsPerMs + viewState.timeOffsetMs)
          const newEndMs = Math.max(drawingState.startMs + slotDurationMs, rawTimeMs)
          
          setDrawingState(prev => prev ? { ...prev, currentEndMs: newEndMs } : null)
        }
      }
    }
  }, [pinchState, touchState, getTouchPosOnCanvas, utils, clearLongPressTimer, pixelsPerMs, updateNote, updateViewState, mode, cycleCount, startBatchUpdate, canvasRef, drawingState, setDrawingState, viewState.timeOffsetMs])
  
  // Touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
      } else if (drawingState) {
        // Tap on empty - create note (one quantize slot)
        utils.createNoteFromDrawingState(drawingState, createNote, playDrum)
      }
    } else if (touchState.interactionType === 'draw' && drawingState) {
      // Finish drawing
      utils.createNoteFromDrawingState(drawingState, createNote, playDrum)
    } else if (touchState.interactionType === 'move' || touchState.interactionType === 'resize') {
      // Finish move/resize - batch update ends
      endBatchUpdate()
    }
    
    // Reset states
    setTouchState(null)
    setDrawingState(null)
  }, [touchState, pinchState, drawingState, clearLongPressTimer, utils, deleteNote, setSelectedNoteIds, createNote, playDrum, endBatchUpdate, setDrawingState])
  
  // Touch cancel handler
  const handleTouchCancel = useCallback((_e: React.TouchEvent) => {
    clearLongPressTimer()
    
    // If we were in a batch update, end it
    if (touchState?.interactionType === 'move' || touchState?.interactionType === 'resize') {
      endBatchUpdate()
    }
    
    setTouchState(null)
    setPinchState(null)
    setDrawingState(null)
  }, [clearLongPressTimer, touchState, endBatchUpdate, setDrawingState])
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])
  
  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel
  }
}

