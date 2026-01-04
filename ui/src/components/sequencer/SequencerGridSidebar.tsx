import { useMemo } from 'react'
import {
  SequencerNote,
  SequencerMode,
  DRUM_SOUNDS,
  MONITOR_CANVAS_HEIGHT
} from '../../lib/sequencer/types'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_KEY_INDICES = [1, 3, 6, 8, 10]

const getMidiNoteName = (midi: number) => {
  const octave = Math.floor(midi / 12) - 1
  const noteName = NOTE_NAMES[midi % 12]
  return `${noteName}${octave}`
}

const isBlackKey = (midi: number) => BLACK_KEY_INDICES.includes(midi % 12)

interface SequencerGridSidebarProps {
  mode: SequencerMode
  midiOffset: number
  visibleSemitones: number
  laneHeight: number
  notes: SequencerNote[]
}

interface SidebarLabel {
  label: string
  isActive?: boolean
  isC?: boolean
  isBlackKey?: boolean
}

export const SequencerGridSidebar = ({
  mode,
  midiOffset,
  visibleSemitones,
  laneHeight,
  notes
}: SequencerGridSidebarProps) => {
  const sidebarLabels = useMemo((): SidebarLabel[] => {
    if (mode === 'drum') {
      return DRUM_SOUNDS.map((drum) => ({
        label: drum.label,
        isActive: notes.some(n => n.drumSound === drum.key)
      })).reverse()
    } else {
      const labels: SidebarLabel[] = []
      for (let i = visibleSemitones - 1; i >= 0; i--) {
        const midi = midiOffset + i
        labels.push({
          label: getMidiNoteName(midi),
          isC: midi % 12 === 0,
          isBlackKey: isBlackKey(midi),
          isActive: notes.some(n => n.midi === midi)
        })
      }
      return labels
    }
  }, [mode, midiOffset, visibleSemitones, notes])

  return (
    <div 
      className="flex-shrink-0 bg-slate-900/80 border-r border-slate-700/30 overflow-hidden"
      style={{ width: mode === 'drum' ? '70px' : '40px', height: MONITOR_CANVAS_HEIGHT }}
    >
      <div className="flex flex-col h-full">
        {sidebarLabels.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-end pr-1 font-mono transition-colors ${
              item.isActive
                ? mode === 'drum' ? 'text-green-400 bg-green-400/10' : 'text-amber-400 bg-amber-400/10'
                : item.isC
                  ? 'text-slate-200'
                  : item.isBlackKey
                    ? 'text-slate-500 bg-slate-900/50'
                    : 'text-slate-400'
            }`}
            style={{ 
              height: `${laneHeight}px`,
              fontSize: Math.max(7, Math.min(10, laneHeight * 0.6)) + 'px',
              lineHeight: '1'
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

