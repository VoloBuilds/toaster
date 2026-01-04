import { useRef, useEffect, useCallback, useState } from 'react'
import { SequencerNote, CycleInfo, DrumSound } from '../../lib/sequencer/types'
import { STRUDEL_LATENCY_S, STRUDEL_LATENCY_MS } from '../../lib/sequencer/timing'

// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { getAudioContext } from '@strudel/webaudio'

interface UsePlaybackPreviewOptions {
  notes: SequencerNote[]
  isStrudelPlaying: boolean
  getCycleInfo?: () => CycleInfo | null
  cycleCount: number
  // Immediate playback (for old API compatibility - UI feedback)
  playNote: (midi: number) => void
  stopNote: (midi: number) => void
  playDrum?: (drumSound: DrumSound) => void
  // Scheduled playback (for synced audio)
  playNoteAt?: (midi: number, scheduledTime: number) => void
  stopNoteAt?: (midi: number, scheduledTime: number) => void
  playDrumAt?: (drumSound: DrumSound, scheduledTime: number) => void
}

interface UsePlaybackPreviewReturn {
  // Current pattern position in ms (for visual playhead sync)
  patternPositionMs: number
}

/**
 * Hook that syncs recorded note playback with Strudel's playhead.
 * 
 * Uses LOOK-AHEAD SCHEDULING to stay in sync with Strudel:
 * - Strudel schedules sounds 100ms (STRUDEL_LATENCY_S) ahead of currentTime
 * - We do the same: look ahead, find notes in the window, schedule them
 * - This ensures our sounds play at the exact same time as Strudel's
 */
export const usePlaybackPreview = ({
  notes,
  isStrudelPlaying,
  getCycleInfo,
  cycleCount,
  playNote,
  stopNote,
  playDrum,
  playNoteAt,
  stopNoteAt,
  playDrumAt
}: UsePlaybackPreviewOptions): UsePlaybackPreviewReturn => {
  // Track which notes have been scheduled for playback
  // Map<noteId, { midiNumber, scheduledStopTime }>
  const scheduledNotesRef = useRef<Map<string, { midi: number; stopTime: number }>>(new Map())
  
  // Track which drum notes have been scheduled (by note ID)
  const scheduledDrumsRef = useRef<Set<string>>(new Set())
  
  // Track pattern position in ms (across all cycles)
  const lastPatternPositionRef = useRef<number>(0)
  
  // Track last Strudel cycle phase to detect wrap
  const lastStrudelCycleRef = useRef<number>(0)
  
  // Track last audio context time we processed (to calculate lookahead window)
  const lastProcessedTimeRef = useRef<number>(0)
  
  // Animation frame ref
  const frameRef = useRef<number | null>(null)
  
  // Exposed pattern position for visual playhead sync
  const [patternPositionMs, setPatternPositionMs] = useState(0)
  
  // Use refs for values that change but shouldn't cause sync loop restart
  const notesRef = useRef<SequencerNote[]>(notes)
  const cycleCountRef = useRef<number>(cycleCount)
  const getCycleInfoRef = useRef<(() => CycleInfo | null) | undefined>(getCycleInfo)
  const playNoteRef = useRef<(midi: number) => void>(playNote)
  const stopNoteRef = useRef<(midi: number) => void>(stopNote)
  const playDrumRef = useRef<((drumSound: DrumSound) => void) | undefined>(playDrum)
  const playNoteAtRef = useRef<((midi: number, time: number) => void) | undefined>(playNoteAt)
  const stopNoteAtRef = useRef<((midi: number, time: number) => void) | undefined>(stopNoteAt)
  const playDrumAtRef = useRef<((drumSound: DrumSound, time: number) => void) | undefined>(playDrumAt)
  
  // Update refs on every render
  notesRef.current = notes
  cycleCountRef.current = cycleCount
  getCycleInfoRef.current = getCycleInfo
  playNoteRef.current = playNote
  stopNoteRef.current = stopNote
  playDrumRef.current = playDrum
  playNoteAtRef.current = playNoteAt
  stopNoteAtRef.current = stopNoteAt
  playDrumAtRef.current = playDrumAt

  // Stop all currently playing preview notes immediately
  const stopAllPreviewNotes = useCallback(() => {
    scheduledNotesRef.current.forEach(({ midi }) => {
      stopNoteRef.current(midi)
    })
    scheduledNotesRef.current.clear()
  }, [])

  // Main sync loop - uses look-ahead scheduling
  const syncLoop = useCallback(() => {
    const currentGetCycleInfo = getCycleInfoRef.current
    const currentCycleCount = cycleCountRef.current
    const currentNotes = notesRef.current
    const currentPlayDrumAt = playDrumAtRef.current
    const currentPlayDrum = playDrumRef.current
    const currentPlayNoteAt = playNoteAtRef.current
    const currentStopNoteAt = stopNoteAtRef.current
    
    const cycleInfo = currentGetCycleInfo?.()
    if (!cycleInfo) {
      frameRef.current = requestAnimationFrame(syncLoop)
      return
    }
    
    // Get audio context for precise timing
    let ac: AudioContext
    try {
      ac = getAudioContext()
    } catch {
      frameRef.current = requestAnimationFrame(syncLoop)
      return
    }
    
    const currentTime = ac.currentTime
    const { phase, cycleDurationMs } = cycleInfo
    const totalPatternDurationMs = currentCycleCount * cycleDurationMs
    
    // Calculate current position within strudel cycle
    const strudelPositionMs = phase * cycleDurationMs
    
    // Detect Strudel cycle wrap-around (phase went from ~1.0 back to ~0.0)
    const didStrudelWrap = phase < 0.1 && lastStrudelCycleRef.current > 0.9
    
    // Calculate pattern position (position across all cycleCount cycles)
    let patternPosMs: number
    
    if (didStrudelWrap) {
      // Strudel wrapped, advance our pattern position by one cycle
      const previousPatternCycle = Math.floor(lastPatternPositionRef.current / cycleDurationMs)
      const nextPatternCycle = (previousPatternCycle + 1) % currentCycleCount
      patternPosMs = nextPatternCycle * cycleDurationMs + strudelPositionMs
    } else {
      // Normal case: maintain position within current pattern cycle
      const currentPatternCycle = Math.floor(lastPatternPositionRef.current / cycleDurationMs) % currentCycleCount
      patternPosMs = currentPatternCycle * cycleDurationMs + strudelPositionMs
    }
    
    // Wrap pattern position to total duration
    patternPosMs = patternPosMs % totalPatternDurationMs
    
    // Detect pattern wrap-around
    const didPatternWrap = patternPosMs < lastPatternPositionRef.current - (cycleDurationMs * 0.5)
    
    if (didPatternWrap) {
      // Pattern wrapped back to start - clear scheduled drums for new cycle
      scheduledDrumsRef.current.clear()
    }
    
    // Calculate lookahead window
    // We look ahead by STRUDEL_LATENCY_MS to schedule notes before they should play
    const lookAheadMs = STRUDEL_LATENCY_MS
    const lookAheadEndMs = (patternPosMs + lookAheadMs) % totalPatternDurationMs
    const lookAheadWraps = (patternPosMs + lookAheadMs) >= totalPatternDurationMs
    
    // Update tracking
    lastPatternPositionRef.current = patternPosMs
    lastStrudelCycleRef.current = phase
    lastProcessedTimeRef.current = currentTime
    setPatternPositionMs(patternPosMs)
    
    // Filter notes by type
    const pianoNotes = currentNotes.filter(n => n.type === 'piano' && n.midi !== undefined)
    const drumNotes = currentNotes.filter(n => n.type === 'drum' && n.drumSound !== undefined)
    
    // Clean up deleted piano notes that are still tracked
    const currentPianoNoteIds = new Set(pianoNotes.map(n => n.id))
    for (const [noteId, { midi }] of scheduledNotesRef.current.entries()) {
      if (!currentPianoNoteIds.has(noteId)) {
        stopNoteRef.current(midi)
        scheduledNotesRef.current.delete(noteId)
      }
    }
    
    // ===============================
    // Schedule Drum Notes (one-shot)
    // ===============================
    for (const note of drumNotes) {
      if (!note.drumSound) continue
      
      const noteId = note.id
      if (scheduledDrumsRef.current.has(noteId)) continue
      
      const noteStartMs = note.startMs % totalPatternDurationMs
      
      // Check if note is within lookahead window
      let shouldSchedule = false
      
      if (lookAheadWraps) {
        // Lookahead window wraps around pattern end
        // Check if note is in [patternPosMs, totalPatternDurationMs) OR [0, lookAheadEndMs)
        if (noteStartMs >= patternPosMs || noteStartMs < lookAheadEndMs) {
          shouldSchedule = true
        }
      } else {
        // Normal case: check if note is in [patternPosMs, lookAheadEndMs)
        if (noteStartMs >= patternPosMs && noteStartMs < lookAheadEndMs) {
          shouldSchedule = true
        }
      }
      
      if (shouldSchedule) {
        // Calculate the exact audio context time when this note should play
        // msUntilNote can be negative if note is behind current position (wrap case)
        let msUntilNote = noteStartMs - patternPosMs
        if (msUntilNote < 0) {
          msUntilNote += totalPatternDurationMs
        }
        
        // Convert to audio time: currentTime + (ms / 1000) + Strudel's latency
        const targetAudioTime = currentTime + (msUntilNote / 1000) + STRUDEL_LATENCY_S
        
        // Schedule the drum hit
        const drumSound = note.drumSound
        if (currentPlayDrumAt && drumSound) {
          currentPlayDrumAt(drumSound, targetAudioTime)
        } else if (currentPlayDrum && drumSound) {
          // Fallback: schedule with setTimeout (less accurate)
          const msDelay = (targetAudioTime - currentTime) * 1000
          setTimeout(() => currentPlayDrum(drumSound), Math.max(0, msDelay))
        }
        
        scheduledDrumsRef.current.add(noteId)
      }
    }
    
    // ===============================
    // Schedule Piano Notes (sustained)
    // ===============================
    for (const note of pianoNotes) {
      if (note.midi === undefined) continue
      
      const noteId = note.id
      const isScheduled = scheduledNotesRef.current.has(noteId)
      
      const noteStartMs = note.startMs % totalPatternDurationMs
      const noteDurationMs = note.endMs - note.startMs
      
      // Check if note START is within lookahead window
      let shouldScheduleStart = false
      
      if (!isScheduled) {
        if (lookAheadWraps) {
          if (noteStartMs >= patternPosMs || noteStartMs < lookAheadEndMs) {
            shouldScheduleStart = true
          }
        } else {
          if (noteStartMs >= patternPosMs && noteStartMs < lookAheadEndMs) {
            shouldScheduleStart = true
          }
        }
      }
      
      if (shouldScheduleStart) {
        // Calculate audio times
        let msUntilStart = noteStartMs - patternPosMs
        if (msUntilStart < 0) {
          msUntilStart += totalPatternDurationMs
        }
        
        const startAudioTime = currentTime + (msUntilStart / 1000) + STRUDEL_LATENCY_S
        const stopAudioTime = startAudioTime + (noteDurationMs / 1000)
        
        // Before starting, check if another note with same MIDI is already scheduled
        // If so, remove it from tracking
        for (const [existingNoteId, { midi: existingMidi }] of scheduledNotesRef.current.entries()) {
          if (existingMidi === note.midi && existingNoteId !== noteId) {
            scheduledNotesRef.current.delete(existingNoteId)
          }
        }
        
        // Schedule note start
        if (currentPlayNoteAt) {
          currentPlayNoteAt(note.midi, startAudioTime)
        } else {
          // Fallback
          const msDelay = (startAudioTime - currentTime) * 1000
          const midi = note.midi
          setTimeout(() => playNoteRef.current(midi), Math.max(0, msDelay))
        }
        
        // Schedule note stop
        if (currentStopNoteAt) {
          currentStopNoteAt(note.midi, stopAudioTime)
        } else {
          // Fallback
          const msDelay = (stopAudioTime - currentTime) * 1000
          const midi = note.midi
          setTimeout(() => stopNoteRef.current(midi), Math.max(0, msDelay))
        }
        
        scheduledNotesRef.current.set(noteId, { midi: note.midi, stopTime: stopAudioTime })
      }
      
      // Clean up notes that have finished playing
      if (isScheduled) {
        const scheduled = scheduledNotesRef.current.get(noteId)
        if (scheduled && currentTime > scheduled.stopTime + 0.1) {
          scheduledNotesRef.current.delete(noteId)
        }
      }
    }

    // Continue the loop
    frameRef.current = requestAnimationFrame(syncLoop)
  }, [stopAllPreviewNotes])

  // Start/stop the sync loop based on playback state
  useEffect(() => {
    if (isStrudelPlaying) {
      // Initialize tracking state
      const cycleInfo = getCycleInfoRef.current?.()
      lastPatternPositionRef.current = 0
      lastStrudelCycleRef.current = cycleInfo?.phase ?? 0
      scheduledDrumsRef.current.clear()
      scheduledNotesRef.current.clear()
      
      try {
        lastProcessedTimeRef.current = getAudioContext().currentTime
      } catch {
        lastProcessedTimeRef.current = 0
      }
      
      // Start the sync loop
      frameRef.current = requestAnimationFrame(syncLoop)
    } else {
      // Stop playback
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      stopAllPreviewNotes()
      scheduledDrumsRef.current.clear()
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      stopAllPreviewNotes()
    }
  }, [isStrudelPlaying, syncLoop, stopAllPreviewNotes])

  // Reset position when not playing
  useEffect(() => {
    if (!isStrudelPlaying) {
      setPatternPositionMs(0)
    }
  }, [isStrudelPlaying])

  return { patternPositionMs }
}
