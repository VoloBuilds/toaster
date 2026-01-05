import { useState, useEffect } from 'react'
import { ChevronDown, Sparkles, Trash2, Undo2, Redo2, Music, Drum, HelpCircle } from 'lucide-react'
import { useSequencerContext } from './context/SequencerContext'
import { QuantizeValue, MAX_CYCLES } from '../../lib/sequencer/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'

const QUANTIZE_OPTIONS: QuantizeValue[] = ['1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32', '1/32T']
const CYCLE_OPTIONS = Array.from({ length: MAX_CYCLES }, (_, i) => i + 1)

// Detect touch device
const getIsTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Detect if we're on a large screen (desktop/laptop sized)
const getIsLargeScreen = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= 768
}

// Detect Mac platform
const getIsMac = () => {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

export const ControlBar = () => {
  const [helpOpen, setHelpOpen] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  
  useEffect(() => {
    setIsTouchDevice(getIsTouchDevice())
    setIsLargeScreen(getIsLargeScreen())
    setIsMac(getIsMac())
    
    const handleResize = () => setIsLargeScreen(getIsLargeScreen())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Modifier key text based on platform
  const modKey = isMac ? '⌘' : 'Ctrl'
  const {
    notes,
    quantizeValue,
    setQuantizeValue,
    cycleCount,
    setCycleCount,
    mode,
    setMode,
    undo,
    redo,
    canUndo,
    canRedo,
    handleClear,
    sendToPrompt
  } = useSequencerContext()
  
  const hasNotes = notes.length > 0

  // Mode + Quantize + Cycles group
  const modeQuantCyclesGroup = (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Mode Toggle - Pill shaped */}
      <div className="relative flex items-center p-0.5 rounded-full bg-slate-700/60 border border-slate-600/50">
        {/* Sliding indicator */}
        <div 
          className={`
            absolute top-0.5 bottom-0.5 left-0.5 w-8 md:w-9 rounded-full
            bg-amber-600/90 shadow-md
            transition-transform duration-200 ease-out
            ${mode === 'notes' ? 'translate-x-0' : 'translate-x-full'}
          `}
        />
        <button
          onClick={() => setMode('notes')}
          className={`
            relative z-10 flex items-center justify-center w-8 h-7 md:w-9 md:h-8 rounded-full
            transition-colors duration-150
            ${mode === 'notes'
              ? 'text-amber-50'
              : 'text-slate-400 hover:text-slate-200'
            }
          `}
          title="Notes mode - melodic notes"
        >
          <Music className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </button>
        <button
          onClick={() => setMode('drum')}
          className={`
            relative z-10 flex items-center justify-center w-8 h-7 md:w-9 md:h-8 rounded-full
            transition-colors duration-150
            ${mode === 'drum'
              ? 'text-amber-50'
              : 'text-slate-400 hover:text-slate-200'
            }
          `}
          title="Drum mode - drum samples"
        >
          <Drum className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </button>
      </div>

      {/* Quantize selector */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-[10px] lg:text-xs font-mono text-slate-400 uppercase hidden lg:inline">Quantize</span>
        <div className="relative">
            <select
              value={quantizeValue}
              onChange={(e) => setQuantizeValue(e.target.value as QuantizeValue)}
              className={`
                appearance-none h-8 md:h-9 px-2 md:px-3 pr-6 md:pr-7 rounded
                font-mono text-xs md:text-sm
                bg-slate-700/80 text-slate-200
                border border-slate-600/50
                focus:outline-none focus:ring-2 focus:ring-amber-400/50
                cursor-pointer
              `}
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            {QUANTIZE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Cycle count selector */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-[10px] lg:text-xs font-mono text-slate-400 uppercase hidden lg:inline">Cycles</span>
        <div className="relative">
            <select
              value={cycleCount}
              onChange={(e) => setCycleCount(Number(e.target.value))}
              className={`
                appearance-none h-8 md:h-9 px-2 md:px-3 pr-6 md:pr-7 rounded
                font-mono text-xs md:text-sm
                bg-slate-700/80 text-slate-200
                border border-slate-600/50
                focus:outline-none focus:ring-2 focus:ring-amber-400/50
                cursor-pointer
              `}
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            {CYCLE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )

  // Undo + Redo + Clear group
  const undoRedoClearGroup = (
    <div className="flex items-center gap-1.5 md:gap-2">
      {/* Undo Button */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`
          flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded
          font-mono text-xs md:text-sm
          transition-all duration-150
          ${canUndo
            ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 hover:text-slate-100'
            : 'bg-slate-700/40 text-slate-600 cursor-not-allowed'
          }
          border border-slate-600/50
          focus:outline-none focus:ring-2 focus:ring-amber-400/50
        `}
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        title={`Undo (${modKey}+Z)`}
      >
        <Undo2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>

      {/* Redo Button */}
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`
          flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded
          font-mono text-xs md:text-sm
          transition-all duration-150
          ${canRedo
            ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 hover:text-slate-100'
            : 'bg-slate-700/40 text-slate-600 cursor-not-allowed'
          }
          border border-slate-600/50
          focus:outline-none focus:ring-2 focus:ring-amber-400/50
        `}
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        title={isMac ? `Redo (${modKey}+⇧+Z)` : `Redo (${modKey}+Y)`}
      >
        <Redo2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>

      {/* Clear Button */}
      <button
        onClick={handleClear}
        disabled={!hasNotes}
        className={`
          flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded
          font-mono text-xs md:text-sm
          transition-all duration-150
          ${hasNotes
            ? 'bg-slate-700/80 text-slate-300 hover:bg-red-900/60 hover:text-red-200'
            : 'bg-slate-700/40 text-slate-600 cursor-not-allowed'
          }
          border border-slate-600/50
          focus:outline-none focus:ring-2 focus:ring-amber-400/50
        `}
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        title="Clear all notes"
      >
        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>
    </div>
  )

  // Help button
  const helpButton = (
    <button
      onClick={() => setHelpOpen(true)}
      className={`
        flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded
        font-mono text-xs md:text-sm
        transition-all duration-150
        bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 hover:text-slate-100
        border border-slate-600/50
        focus:outline-none focus:ring-2 focus:ring-amber-400/50
      `}
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
      title="Help"
    >
      <HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
    </button>
  )

  // Use button
  const useButton = (
    <button
      onClick={sendToPrompt}
      disabled={!hasNotes}
      className={`
        flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 rounded
        font-mono text-xs md:text-sm
        transition-all duration-150
        ${hasNotes
          ? 'bg-amber-600/80 text-amber-50 hover:bg-amber-500/80'
          : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
        }
        border border-slate-600/50
        focus:outline-none focus:ring-2 focus:ring-amber-400/50
      `}
      style={{
        boxShadow: hasNotes
          ? 'inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'none'
      }}
    >
      <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
      <span>Use</span>
    </button>
  )

  return (
    <div className="px-2 md:px-3 py-2 bg-gradient-to-b from-slate-800 to-slate-900 border-y border-slate-700/50">
      {/* Mode 2: Below md - Two rows */}
      <div className="md:hidden flex flex-col gap-2">
        {/* Row 1: Mode+Quant+Cycles (left) ... Help (right) */}
        <div className="flex items-center justify-between">
          {modeQuantCyclesGroup}
          {helpButton}
        </div>
        {/* Row 2: Undo+Redo+Clear (left) ... Use (right) */}
        <div className="flex items-center justify-between">
          {undoRedoClearGroup}
          {useButton}
        </div>
      </div>

      {/* Mode 1: md+ - Three equal columns */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        <div className="flex justify-start">
          {modeQuantCyclesGroup}
        </div>
        <div className="flex justify-center">
          {undoRedoClearGroup}
        </div>
        <div className="flex justify-end items-center gap-2">
          {helpButton}
          {useButton}
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md max-h-[85vh] overflow-y-auto" hideCloseButton aria-describedby={undefined}>
          <DialogHeader className="!text-center">
            <DialogTitle className="text-red-500 font-mono text-xl tracking-[0.3em] opacity-90 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] text-center">
              S E Q U E N C E R
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              The sequencer helps you write melodies and beats. Draw in notes and hear them live. 
              When you're happy with your pattern, click <strong className="text-amber-300">Use</strong> to 
              add the Strudel pattern to your prompt.
            </p>
            
            {/* Keyboard controls - show on large screens */}
            {isLargeScreen && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs uppercase text-slate-400">Keyboard &amp; Mouse</h4>
                <ul className="space-y-1.5 text-xs font-mono">
                  <li><span className="text-amber-300">Click</span> — Draw a note</li>
                  <li><span className="text-amber-300">Shift + Drag</span> — Select multiple notes</li>
                  <li><span className="text-amber-300">{modKey} + Drag</span> — Copy notes</li>
                  <li><span className="text-amber-300">{modKey} + Scroll</span> — Zoom in/out</li>
                  <li><span className="text-amber-300">Delete / Backspace</span> — Delete selected</li>
                  <li><span className="text-amber-300">{modKey} + C/V/X</span> — Copy / Paste / Cut</li>
                  <li><span className="text-amber-300">{modKey} + Z{isMac ? '/⇧Z' : '/Y'}</span> — Undo / Redo</li>
                  <li><span className="text-amber-300">{modKey} + A</span> — Select all</li>
                </ul>
              </div>
            )}

            {/* Touch controls - show if device supports touch */}
            {isTouchDevice && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs uppercase text-slate-400">Touch</h4>
                <ul className="space-y-1.5 text-xs font-mono">
                  <li><span className="text-amber-300">Tap</span> — Add or remove notes</li>
                  <li><span className="text-amber-300">Drag</span> — Draw notes or resize</li>
                  <li><span className="text-amber-300">Hold + Drag</span> — Move notes</li>
                  <li><span className="text-amber-300">Pinch</span> — Zoom in/out</li>
                </ul>
              </div>
            )}

            {/* Fallback for small non-touch screens */}
            {!isLargeScreen && !isTouchDevice && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs uppercase text-slate-400">Controls</h4>
                <ul className="space-y-1.5 text-xs font-mono">
                  <li><span className="text-amber-300">Click</span> — Draw a note</li>
                  <li><span className="text-amber-300">Delete</span> — Delete selected</li>
                  <li><span className="text-amber-300">{modKey} + Z{isMac ? '/⇧Z' : '/Y'}</span> — Undo / Redo</li>
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-mono text-xs uppercase text-slate-400">Options</h4>
              <ul className="space-y-1.5 text-xs font-mono">
                <li><span className="text-amber-300">Notes / Drum</span> — Toggle between melodic notes and drum samples</li>
                <li><span className="text-amber-300">Quantize</span> — Snap notes to grid divisions</li>
                <li><span className="text-amber-300">Cycles</span> — Set pattern length (1-8 bars)</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setHelpOpen(false)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-mono"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
