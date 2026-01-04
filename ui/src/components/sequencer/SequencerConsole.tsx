import { useEffect, useRef, useState } from 'react'
import { SequencerGrid } from './SequencerGrid'
import { ControlBar } from './ControlBar'
import { SequencerProvider, useSequencerContext } from './context/SequencerContext'
import { CycleInfo } from '../../lib/sequencer/types'

interface SequencerConsoleProps {
  isOpen: boolean
  onSendToPrompt: (notation: string) => void
  getCycleInfo?: () => CycleInfo | null
  isStrudelPlaying?: boolean
}

// Detect touch device
const getIsTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Inner component that uses context
const SequencerConsoleInner = ({ isOpen }: { isOpen: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { copy, paste, cut, undo, redo, selectAll } = useSequencerContext()
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice(getIsTouchDevice())
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      if (isCtrl && e.key === 'c') {
        e.preventDefault()
        copy()
      } else if (isCtrl && e.key === 'v') {
        e.preventDefault()
        paste()
      } else if (isCtrl && e.key === 'x') {
        e.preventDefault()
        cut()
      } else if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z') || (isCtrl && e.shiftKey && e.key === 'Z')) {
        e.preventDefault()
        redo()
      } else if (isCtrl && e.key === 'a') {
        e.preventDefault()
        selectAll()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, copy, paste, cut, undo, redo, selectAll])

  return (
    <div 
      ref={containerRef}
      className={`
        w-full overflow-hidden
        bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950
        border border-slate-700/50 border-b-0
        rounded-t-xl
        shadow-2xl
        transition-all duration-300 ease-out
        ${isOpen 
          ? 'max-h-[350px] opacity-100' 
          : 'max-h-0 opacity-0 pointer-events-none'
        }
      `}
      style={{
        boxShadow: isOpen ? '0 -10px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none',
        transformOrigin: 'bottom center'
      }}
    >
      {/* Sequencer Grid */}
      <div className="p-2 sm:p-3">
        <SequencerGrid />
      </div>
      
      {/* Control Bar */}
      <ControlBar />
      
      {/* Hints */}
      <div className="px-3 pb-2 text-[9px] sm:text-[10px] font-mono text-slate-500 flex justify-center sm:justify-between">
        {isTouchDevice ? (
          <span>Tap: Add/Remove | Drag: Draw/Resize | Hold+Drag: Move | Pinch: Zoom</span>
        ) : (
          <>
            <span className="hidden sm:inline">Click: Draw note | Shift+Drag: Select | Ctrl+Drag: Copy | Del: Delete</span>
            <span className="hidden sm:inline">Ctrl+C/V/X: Copy/Paste/Cut | Ctrl+Z/Y: Undo/Redo</span>
            <span className="sm:hidden">Click: Draw | Del: Delete | Ctrl+Z/Y: Undo/Redo</span>
          </>
        )}
      </div>
    </div>
  )
}

// Outer component wraps with provider
export const SequencerConsole = ({
  isOpen,
  onSendToPrompt,
  getCycleInfo,
  isStrudelPlaying = false
}: SequencerConsoleProps) => {
  return (
    <SequencerProvider
      getCycleInfo={getCycleInfo}
      isStrudelPlaying={isStrudelPlaying}
      onSendToPrompt={onSendToPrompt}
    >
      <SequencerConsoleInner isOpen={isOpen} />
    </SequencerProvider>
  )
}
