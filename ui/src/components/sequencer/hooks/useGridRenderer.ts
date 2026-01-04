import { useCallback, useEffect, useRef, RefObject } from 'react'
import {
  SequencerNote,
  SequencerMode,
  QuantizeValue,
  DRUM_SOUNDS,
  MONITOR_CANVAS_WIDTH,
  MONITOR_CANVAS_HEIGHT
} from '../../../lib/sequencer/types'
import { getSubdivisionsPerCycle } from '../../../lib/sequencer/quantization'
import { NoteRect } from './useGridCoordinates'

const CANVAS_WIDTH = MONITOR_CANVAS_WIDTH
const CANVAS_HEIGHT = MONITOR_CANVAS_HEIGHT

// Colors
const COLORS = {
  background: 'rgba(15, 23, 42, 0.95)',
  laneWhiteKey: 'rgba(30, 41, 59, 0.4)',
  laneBlackKey: 'rgba(15, 23, 42, 0.7)',
  laneDrum: 'rgba(30, 41, 59, 0.5)',
  laneDrumAlt: 'rgba(20, 30, 48, 0.6)',
  laneSeparator: 'rgba(100, 116, 139, 0.15)',
  grid: 'rgba(245, 158, 11, 0.12)',
  gridCycle: 'rgba(245, 158, 11, 0.25)',
  note: '#f59e0b',
  noteActive: '#fbbf24',
  noteSelected: '#fcd34d',
  noteDrum: '#22c55e',
  noteDrumSelected: '#86efac',
  playhead: '#f59e0b',
  cursorMarker: '#06b6d4',
}

const BLACK_KEY_INDICES = [1, 3, 6, 8, 10]
const isBlackKey = (midi: number) => BLACK_KEY_INDICES.includes(midi % 12)

// Interaction states for rendering
export interface DrawingState {
  row: number
  startMs: number
  currentEndMs: number
}

export interface BoxSelectState {
  anchorX: number
  anchorY: number
  currentX: number
  currentY: number
  addMode: boolean
}

interface UseGridRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement>
  notes: SequencerNote[]
  mode: SequencerMode
  quantizeValue: QuantizeValue
  cycleDurationMs: number
  
  // View state
  midiOffset: number
  visibleSemitones: number
  timeOffsetMs: number
  visibleDurationMs: number
  laneHeight: number
  pixelsPerMs: number
  
  // Selection and hover
  selectedNoteIds: Set<string>
  hoveredNoteId: string | null
  
  // Interaction states
  drawingState: DrawingState | null
  boxSelectState: BoxSelectState | null
  copyPreviewNotes: Omit<SequencerNote, 'id'>[]
  
  // Playback
  isPlaying: boolean
  playbackPositionMs: number
  cursorPositionMs: number
  
  // Coordinate helpers
  getNoteRect: (note: SequencerNote) => NoteRect
}

export const useGridRenderer = ({
  canvasRef,
  notes,
  mode,
  quantizeValue,
  cycleDurationMs,
  midiOffset,
  visibleSemitones,
  timeOffsetMs,
  visibleDurationMs,
  laneHeight,
  pixelsPerMs,
  selectedNoteIds,
  hoveredNoteId,
  drawingState,
  boxSelectState,
  copyPreviewNotes,
  isPlaying,
  playbackPositionMs,
  cursorPositionMs,
  getNoteRect
}: UseGridRendererOptions) => {
  const animationFrameRef = useRef<number | null>(null)
  const drumRowCount = DRUM_SOUNDS.length
  
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Draw lanes
    const rowCount = mode === 'drum' ? drumRowCount : visibleSemitones
    for (let i = 0; i < rowCount; i++) {
      const y = CANVAS_HEIGHT - ((i + 1) * laneHeight)
      
      if (mode === 'drum') {
        ctx.fillStyle = i % 2 === 0 ? COLORS.laneDrum : COLORS.laneDrumAlt
      } else {
        const midi = midiOffset + i
        ctx.fillStyle = isBlackKey(midi) ? COLORS.laneBlackKey : COLORS.laneWhiteKey
      }
      ctx.fillRect(0, y, CANVAS_WIDTH, laneHeight)
      
      ctx.strokeStyle = COLORS.laneSeparator
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, y + laneHeight)
      ctx.lineTo(CANVAS_WIDTH, y + laneHeight)
      ctx.stroke()
    }
    
    // Draw time grid
    const subdivisions = getSubdivisionsPerCycle(quantizeValue)
    const slotDurationMs = cycleDurationMs / subdivisions
    const visibleEndMs = timeOffsetMs + visibleDurationMs
    const firstSlotMs = Math.ceil(timeOffsetMs / slotDurationMs) * slotDurationMs
    
    for (let slotMs = firstSlotMs; slotMs <= visibleEndMs; slotMs += slotDurationMs) {
      const x = (slotMs - timeOffsetMs) * pixelsPerMs
      if (x < 0 || x > CANVAS_WIDTH) continue
      
      const isCycleBoundary = Math.abs(slotMs % cycleDurationMs) < 0.001 || 
                               Math.abs((slotMs % cycleDurationMs) - cycleDurationMs) < 0.001
      
      ctx.strokeStyle = isCycleBoundary ? COLORS.gridCycle : COLORS.grid
      ctx.lineWidth = isCycleBoundary ? 1.5 : 0.5
      
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    
    // Draw notes
    for (const note of notes) {
      const rect = getNoteRect(note)
      if (rect.x + rect.width < 0 || rect.x > CANVAS_WIDTH) continue
      
      const clampedX = Math.max(0, rect.x)
      const clampedWidth = Math.min(rect.width - (clampedX - rect.x), CANVAS_WIDTH - clampedX)
      if (clampedWidth <= 0) continue
      
      const isSelected = selectedNoteIds.has(note.id)
      const isHovered = note.id === hoveredNoteId
      
      let fillColor: string
      if (note.type === 'drum') {
        fillColor = isSelected ? COLORS.noteDrumSelected : isHovered ? '#4ade80' : COLORS.noteDrum
      } else {
        fillColor = isSelected ? COLORS.noteSelected : isHovered ? COLORS.noteActive : COLORS.note
      }
      
      ctx.fillStyle = fillColor
      const cornerRadius = Math.min(3, rect.height / 3)
      ctx.beginPath()
      ctx.roundRect(clampedX, rect.y, clampedWidth, rect.height, cornerRadius)
      ctx.fill()
      
      if (isSelected || isHovered) {
        ctx.shadowColor = fillColor
        ctx.shadowBlur = isSelected ? 8 : 4
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }
    
    // Draw copy preview notes (ghost notes during Ctrl+drag)
    if (copyPreviewNotes.length > 0) {
      for (const previewNote of copyPreviewNotes) {
        let rowIndex: number
        
        if (mode === 'drum' && previewNote.drumSound) {
          rowIndex = DRUM_SOUNDS.findIndex(d => d.key === previewNote.drumSound)
          if (rowIndex === -1) rowIndex = 0
        } else if (previewNote.midi !== undefined) {
          rowIndex = previewNote.midi - midiOffset
        } else {
          continue
        }
        
        const y = CANVAS_HEIGHT - ((rowIndex + 1) * laneHeight)
        const x = (previewNote.startMs - timeOffsetMs) * pixelsPerMs
        const width = Math.max(2, (previewNote.endMs - previewNote.startMs) * pixelsPerMs)
        
        if (x + width < 0 || x > CANVAS_WIDTH) continue
        
        const clampedX = Math.max(0, x)
        const clampedWidth = Math.min(width - (clampedX - x), CANVAS_WIDTH - clampedX)
        if (clampedWidth <= 0) continue
        
        const ghostColor = previewNote.type === 'drum' 
          ? 'rgba(34, 197, 94, 0.5)' 
          : 'rgba(251, 191, 36, 0.5)'
        const borderColor = previewNote.type === 'drum'
          ? 'rgba(134, 239, 172, 0.8)'
          : 'rgba(252, 211, 77, 0.8)'
        
        ctx.fillStyle = ghostColor
        const cornerRadius = Math.min(3, laneHeight / 3)
        ctx.beginPath()
        ctx.roundRect(clampedX, y, clampedWidth, laneHeight - 1, cornerRadius)
        ctx.fill()
        
        ctx.strokeStyle = borderColor
        ctx.lineWidth = 2
        ctx.setLineDash([4, 2])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
    
    // Draw note being drawn
    if (drawingState) {
      const y = CANVAS_HEIGHT - ((drawingState.row + 1) * laneHeight)
      const x = (drawingState.startMs - timeOffsetMs) * pixelsPerMs
      const width = (drawingState.currentEndMs - drawingState.startMs) * pixelsPerMs
      
      if (!(x + width < 0 || x > CANVAS_WIDTH)) {
        const clampedX = Math.max(0, x)
        const clampedWidth = Math.min(width - (clampedX - x), CANVAS_WIDTH - clampedX)
        
        if (clampedWidth > 0) {
          const pulseIntensity = 0.5 + 0.5 * Math.sin(performance.now() / 100)
          ctx.fillStyle = mode === 'drum' 
            ? `rgba(34, 197, 94, ${0.5 + pulseIntensity * 0.3})`
            : `rgba(251, 191, 36, ${0.5 + pulseIntensity * 0.3})`
          
          const cornerRadius = Math.min(3, laneHeight / 3)
          ctx.beginPath()
          ctx.roundRect(clampedX, y, clampedWidth, laneHeight - 1, cornerRadius)
          ctx.fill()
          
          ctx.shadowColor = mode === 'drum' ? COLORS.noteDrum : COLORS.noteActive
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
          
          ctx.strokeStyle = mode === 'drum' ? COLORS.noteDrumSelected : COLORS.noteSelected
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
    
    // Draw box selection
    if (boxSelectState) {
      const x = Math.min(boxSelectState.anchorX, boxSelectState.currentX)
      const y = Math.min(boxSelectState.anchorY, boxSelectState.currentY)
      const width = Math.abs(boxSelectState.currentX - boxSelectState.anchorX)
      const height = Math.abs(boxSelectState.currentY - boxSelectState.anchorY)
      
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)'
      ctx.fillRect(x, y, width, height)
      
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 2])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
    }
    
    // Draw cursor/paste position marker
    if (cursorPositionMs >= timeOffsetMs && cursorPositionMs <= timeOffsetMs + visibleDurationMs) {
      const cursorX = (cursorPositionMs - timeOffsetMs) * pixelsPerMs
      
      ctx.strokeStyle = COLORS.cursorMarker
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(cursorX, 0)
      ctx.lineTo(cursorX, CANVAS_HEIGHT)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // Draw playhead
    if (isPlaying && playbackPositionMs > 0) {
      const playheadX = (playbackPositionMs - timeOffsetMs) * pixelsPerMs
      
      if (playheadX >= 0 && playheadX <= CANVAS_WIDTH) {
        ctx.strokeStyle = COLORS.playhead
        ctx.lineWidth = 2
        ctx.shadowColor = COLORS.playhead
        ctx.shadowBlur = 8
        
        ctx.beginPath()
        ctx.moveTo(playheadX, 0)
        ctx.lineTo(playheadX, CANVAS_HEIGHT)
        ctx.stroke()
        
        ctx.shadowBlur = 0
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(render)
  }, [
    canvasRef, notes, mode, quantizeValue, cycleDurationMs,
    midiOffset, visibleSemitones, timeOffsetMs, visibleDurationMs,
    laneHeight, pixelsPerMs, selectedNoteIds, hoveredNoteId,
    drawingState, boxSelectState, copyPreviewNotes,
    isPlaying, playbackPositionMs, cursorPositionMs, getNoteRect, drumRowCount
  ])
  
  // Start/stop render loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render)
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])
}

