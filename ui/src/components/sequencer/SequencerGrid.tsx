import { useRef, useMemo } from 'react'
import { useSequencerContext } from './context/SequencerContext'
import { useGridCoordinates } from './hooks/useGridCoordinates'
import { useGridRenderer } from './hooks/useGridRenderer'
import { useGridInteractions } from './hooks/useGridInteractions'
import { SequencerGridSidebar } from './SequencerGridSidebar'
import { 
  MONITOR_CANVAS_WIDTH,
  MONITOR_CANVAS_HEIGHT,
  DEFAULT_CYCLE_DURATION_MS
} from '../../lib/sequencer/types'

const CANVAS_WIDTH = MONITOR_CANVAS_WIDTH
const CANVAS_HEIGHT = MONITOR_CANVAS_HEIGHT

export const SequencerGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get all state from context
  const {
    notes,
    mode,
    viewState,
    updateViewState,
    quantizeValue,
    cycleCount,
    getCycleInfo,
    cycleDurationMs,
    isPlaying,
    playbackPositionMs,
    cursorPositionMs,
    setCursorPositionMs,
    selectedNoteIds,
    setSelectedNoteIds,
    createNote,
    createNotes,
    updateNote,
    deleteNote,
    deleteNotes,
    startBatchUpdate,
    endBatchUpdate,
    playDrum
  } = useSequencerContext()
  
  const { midiOffset, visibleSemitones, timeOffsetMs, visibleDurationMs } = viewState
  
  // Coordinate utilities
  const coordinates = useGridCoordinates({
    mode,
    viewState,
    canvasRef
  })
  
  const { laneHeight, pixelsPerMs, getNoteRect, getTouchPosOnCanvas } = coordinates
  
  // Interactions
  const interactions = useGridInteractions({
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
    getMousePosOnCanvas: coordinates.getMousePosOnCanvas,
    getTouchPosOnCanvas,
    xToTimeMs: coordinates.xToTimeMs,
    yToRow: coordinates.yToRow,
    findNoteAtPosition: coordinates.findNoteAtPosition,
    findNotesInRect: coordinates.findNotesInRect
  })
  
  // Renderer
  useGridRenderer({
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
    hoveredNoteId: interactions.hoveredNoteId,
    drawingState: interactions.drawingState,
    boxSelectState: interactions.boxSelectState,
    copyPreviewNotes: interactions.copyPreviewNotes,
    isPlaying,
    playbackPositionMs,
    cursorPositionMs,
    getNoteRect
  })
  
  // Cycle markers for display
  const cycleMarkers = useMemo(() => {
    const cycleInfo = getCycleInfo()
    const cycleDuration = cycleInfo?.cycleDurationMs || DEFAULT_CYCLE_DURATION_MS
    const markers = []
    
    const firstCycle = Math.floor(timeOffsetMs / cycleDuration)
    const lastCycle = Math.ceil((timeOffsetMs + visibleDurationMs) / cycleDuration)
    
    for (let c = firstCycle; c <= lastCycle; c++) {
      const cycleStartMs = c * cycleDuration
      const x = (cycleStartMs - timeOffsetMs) * pixelsPerMs
      if (x >= 0 && x <= CANVAS_WIDTH) {
        markers.push({ cycle: c + 1, x, percentage: (x / CANVAS_WIDTH) * 100 })
      }
    }
    return markers
  }, [timeOffsetMs, visibleDurationMs, pixelsPerMs, getCycleInfo])

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-slate-700/50 flex"
      style={{ height: CANVAS_HEIGHT }}
    >
      {/* Sidebar */}
      <SequencerGridSidebar
        mode={mode}
        midiOffset={midiOffset}
        visibleSemitones={visibleSemitones}
        laneHeight={laneHeight}
        notes={notes}
      />
      
      {/* Canvas container */}
      <div className="relative flex-1 overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none rounded-r-lg"
          style={{
            boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.08), inset 0 0 60px rgba(0, 0, 0, 0.3)'
          }}
        />
        
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full touch-none"
          style={{ 
            imageRendering: 'pixelated',
            cursor: interactions.cursorStyle,
            height: CANVAS_HEIGHT
          }}
          onMouseDown={interactions.handleMouseDown}
          onMouseMove={interactions.handleMouseMove}
          onMouseUp={interactions.handleMouseUp}
          onMouseLeave={interactions.handleMouseLeave}
          onTouchStart={interactions.handleTouchStart}
          onTouchMove={interactions.handleTouchMove}
          onTouchEnd={interactions.handleTouchEnd}
          onTouchCancel={interactions.handleTouchCancel}
        />
        
        {/* Cycle labels */}
        <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none">
          {cycleMarkers.map(({ cycle, percentage }) => (
            <div
              key={cycle}
              className="absolute text-[8px] sm:text-[9px] font-mono text-amber-500/60 bg-slate-900/80 px-1 rounded-sm"
              style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
            >
              {cycle}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
