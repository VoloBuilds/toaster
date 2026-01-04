import { ChevronDown, Sparkles, Trash2, Undo2, Redo2, Piano, Drum } from 'lucide-react'
import { useSequencerContext } from './context/SequencerContext'
import { QuantizeValue, MAX_CYCLES } from '../../lib/sequencer/types'

const QUANTIZE_OPTIONS: QuantizeValue[] = ['1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32', '1/32T']
const CYCLE_OPTIONS = Array.from({ length: MAX_CYCLES }, (_, i) => i + 1)

export const ControlBar = () => {
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

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-gradient-to-b from-slate-800 to-slate-900 border-y border-slate-700/50">
      {/* Left group: Undo, Redo, Clear */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`
            flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded
            font-mono text-xs sm:text-sm
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
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Redo Button */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`
            flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded
            font-mono text-xs sm:text-sm
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
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          disabled={!hasNotes}
          className={`
            flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded
            font-mono text-xs sm:text-sm
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
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Center group: Mode Toggle, Quantize, Cycles */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center rounded-md overflow-hidden border border-slate-600/50">
          <button
            onClick={() => setMode('piano')}
            className={`
              flex items-center gap-1 px-2 py-1.5
              font-mono text-[10px] sm:text-xs uppercase
              transition-all duration-150
              ${mode === 'piano'
                ? 'bg-amber-600/80 text-amber-50'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/60 hover:text-slate-200'
              }
            `}
            title="Piano mode - melodic notes"
          >
            <Piano className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Piano</span>
          </button>
          <button
            onClick={() => setMode('drum')}
            className={`
              flex items-center gap-1 px-2 py-1.5
              font-mono text-[10px] sm:text-xs uppercase
              transition-all duration-150
              ${mode === 'drum'
                ? 'bg-amber-600/80 text-amber-50'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/60 hover:text-slate-200'
              }
            `}
            title="Drum mode - drum samples"
          >
            <Drum className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Drums</span>
          </button>
        </div>

        {/* Quantize selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase hidden sm:inline">Quantize</span>
          <div className="relative">
            <select
              value={quantizeValue}
              onChange={(e) => setQuantizeValue(e.target.value as QuantizeValue)}
              className={`
                appearance-none px-2 sm:px-3 py-1 pr-6 sm:pr-7 rounded
                font-mono text-xs sm:text-sm
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
            <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Cycle count selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase hidden sm:inline">Cycles</span>
          <div className="relative">
            <select
              value={cycleCount}
              onChange={(e) => setCycleCount(Number(e.target.value))}
              className={`
                appearance-none px-2 sm:px-3 py-1 pr-6 sm:pr-7 rounded
                font-mono text-xs sm:text-sm
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
            <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right group: Use button */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Use Button */}
        <button
          onClick={sendToPrompt}
          disabled={!hasNotes}
          className={`
            flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded
            font-mono text-xs sm:text-sm
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
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Use</span>
        </button>
      </div>
    </div>
  )
}
