import { useCallback, RefObject } from 'react'
import {
  SequencerNote,
  SequencerMode,
  SequencerViewState,
  DRUM_SOUNDS,
  MONITOR_CANVAS_WIDTH,
  MONITOR_CANVAS_HEIGHT
} from '../../../lib/sequencer/types'
import { slotToMs } from '../../../lib/sequencer/quantization'

const CANVAS_WIDTH = MONITOR_CANVAS_WIDTH
const CANVAS_HEIGHT = MONITOR_CANVAS_HEIGHT

export interface NoteRect {
  x: number
  y: number
  width: number
  height: number
}

export interface NoteHit {
  note: SequencerNote
  edge: 'left' | 'right' | 'body'
}

interface UseGridCoordinatesOptions {
  mode: SequencerMode
  viewState: SequencerViewState
  canvasRef: RefObject<HTMLCanvasElement>
  cycleDurationMs: number
}

interface UseGridCoordinatesReturn {
  // Derived values
  laneHeight: number
  pixelsPerMs: number
  effectiveVisibleRows: number
  
  // Transformation functions
  getNoteRect: (note: SequencerNote) => NoteRect
  getMousePosOnCanvas: (e: MouseEvent | React.MouseEvent) => { x: number; y: number }
  getTouchPosOnCanvas: (touch: { clientX: number; clientY: number }) => { x: number; y: number }
  xToTimeMs: (x: number) => number
  yToRow: (y: number) => number
  timeMsToX: (ms: number) => number
  rowToY: (row: number) => number
  
  // Hit testing
  findNoteAtPosition: (x: number, y: number, notes: SequencerNote[], isTouch?: boolean) => NoteHit | null
  findNotesInRect: (x1: number, y1: number, x2: number, y2: number, notes: SequencerNote[]) => SequencerNote[]
}

export const useGridCoordinates = ({
  mode,
  viewState,
  canvasRef,
  cycleDurationMs
}: UseGridCoordinatesOptions): UseGridCoordinatesReturn => {
  const { midiOffset, visibleSemitones, timeOffsetMs, visibleDurationMs } = viewState
  
  // Derived values
  const drumRowCount = DRUM_SOUNDS.length
  const effectiveVisibleRows = mode === 'drum' ? drumRowCount : visibleSemitones
  const laneHeight = CANVAS_HEIGHT / effectiveVisibleRows
  const pixelsPerMs = CANVAS_WIDTH / visibleDurationMs
  
  // Get note rectangle on canvas
  // Converts slot-based note timing to pixel positions
  const getNoteRect = useCallback((note: SequencerNote): NoteRect => {
    let rowIndex: number
    
    if (mode === 'drum' && note.drumSound) {
      rowIndex = DRUM_SOUNDS.findIndex(d => d.key === note.drumSound)
      if (rowIndex === -1) rowIndex = 0
    } else if (note.midi !== undefined) {
      rowIndex = note.midi - midiOffset
    } else {
      return { x: -100, y: -100, width: 0, height: 0 }
    }
    
    const y = CANVAS_HEIGHT - ((rowIndex + 1) * laneHeight)
    // Convert slots to ms for pixel calculation
    const startMs = slotToMs(note.startSlot, cycleDurationMs)
    const endMs = slotToMs(note.endSlot, cycleDurationMs)
    const x = (startMs - timeOffsetMs) * pixelsPerMs
    const width = Math.max(2, (endMs - startMs) * pixelsPerMs)
    
    return { x, y, width, height: laneHeight - 1 }
  }, [mode, midiOffset, laneHeight, timeOffsetMs, pixelsPerMs, cycleDurationMs])
  
  // Convert mouse event to canvas coordinates
  const getMousePosOnCanvas = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [canvasRef])
  
  // Convert touch to canvas coordinates
  // Using clientX/clientY interface to be compatible with both DOM Touch and React.Touch
  const getTouchPosOnCanvas = useCallback((touch: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    }
  }, [canvasRef])
  
  // Convert x pixel to time in ms
  const xToTimeMs = useCallback((x: number) => {
    return timeOffsetMs + (x / pixelsPerMs)
  }, [timeOffsetMs, pixelsPerMs])
  
  // Convert y pixel to row index
  const yToRow = useCallback((y: number): number => {
    return Math.floor((CANVAS_HEIGHT - y) / laneHeight)
  }, [laneHeight])
  
  // Convert time to x pixel
  const timeMsToX = useCallback((ms: number) => {
    return (ms - timeOffsetMs) * pixelsPerMs
  }, [timeOffsetMs, pixelsPerMs])
  
  // Convert row to y pixel
  const rowToY = useCallback((row: number) => {
    return CANVAS_HEIGHT - ((row + 1) * laneHeight)
  }, [laneHeight])
  
  // Find note at a position with edge detection
  // isTouch: use larger edge threshold for touch interactions
  const findNoteAtPosition = useCallback((x: number, y: number, notes: SequencerNote[], isTouch = false): NoteHit | null => {
    // Touch needs larger hit zones - use 20px or 20% of note width, whichever is larger
    const mouseEdgeThreshold = 8
    
    for (const note of notes) {
      const rect = getNoteRect(note)
      if (rect.width <= 0 || rect.x + rect.width < 0 || rect.x > CANVAS_WIDTH) continue
      
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        const edgeThreshold = isTouch ? Math.max(20, rect.width * 0.2) : mouseEdgeThreshold
        if (x <= rect.x + edgeThreshold) return { note, edge: 'left' }
        if (x >= rect.x + rect.width - edgeThreshold) return { note, edge: 'right' }
        return { note, edge: 'body' }
      }
    }
    return null
  }, [getNoteRect])
  
  // Find notes within a selection rectangle
  const findNotesInRect = useCallback((x1: number, y1: number, x2: number, y2: number, notes: SequencerNote[]): SequencerNote[] => {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    
    const intersecting: SequencerNote[] = []
    
    for (const note of notes) {
      const rect = getNoteRect(note)
      if (rect.width <= 0) continue
      
      if (rect.x + rect.width >= minX && rect.x <= maxX && 
          rect.y + rect.height >= minY && rect.y <= maxY) {
        intersecting.push(note)
      }
    }
    
    return intersecting
  }, [getNoteRect])
  
  return {
    laneHeight,
    pixelsPerMs,
    effectiveVisibleRows,
    getNoteRect,
    getMousePosOnCanvas,
    getTouchPosOnCanvas,
    xToTimeMs,
    yToRow,
    timeMsToX,
    rowToY,
    findNoteAtPosition,
    findNotesInRect
  }
}

