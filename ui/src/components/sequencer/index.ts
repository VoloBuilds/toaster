// Re-export the main SequencerConsole component
export { SequencerConsole } from './SequencerConsole'

// Export context for advanced usage
export { SequencerProvider, useSequencerContext } from './context/SequencerContext'

// Export individual components
export { SequencerGrid } from './SequencerGrid'
export { ControlBar } from './ControlBar'
export { SequencerGridSidebar } from './SequencerGridSidebar'

// Export hooks
export { useGridCoordinates } from './hooks/useGridCoordinates'
export { useGridRenderer } from './hooks/useGridRenderer'
export { useGridInteractions } from './hooks/useGridInteractions'
export { useNoteState } from './useNoteState'
export { useAudioPreview } from './useAudioPreview'
export { usePlaybackPreview } from './usePlaybackPreview'
