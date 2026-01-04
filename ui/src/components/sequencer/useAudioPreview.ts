import { useRef, useCallback, useEffect } from 'react'
import { midiToFrequency } from '../../lib/sequencer/keyMapping'

// Use Strudel's shared audio context for consistent timing
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { getAudioContext as getStrudelAudioContext } from '@strudel/webaudio'

interface ActiveOscillator {
  oscillator: OscillatorNode
  gainNode: GainNode
  scheduledStopTime?: number  // For scheduled stops
}

interface UseAudioPreviewReturn {
  /**
   * Play a note immediately (for UI feedback)
   */
  playNote: (midi: number) => void
  /**
   * Play a note at a specific scheduled time (for synced playback)
   */
  playNoteAt: (midi: number, scheduledTime: number) => void
  /**
   * Stop a note immediately
   */
  stopNote: (midi: number) => void
  /**
   * Stop a note at a specific scheduled time
   */
  stopNoteAt: (midi: number, scheduledTime: number) => void
  /**
   * Stop all currently playing notes
   */
  stopAllNotes: () => void
}

export const useAudioPreview = (): UseAudioPreviewReturn => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const activeOscillatorsRef = useRef<Map<number, ActiveOscillator>>(new Map())

  // Get Strudel's shared audio context (ensures same time base for synced playback)
  const getAudioContext = useCallback((): AudioContext => {
    // Get Strudel's shared audio context
    const ctx = getStrudelAudioContext() as AudioContext
    
    // Initialize our processing chain if not done yet (or if context changed)
    if (audioContextRef.current !== ctx) {
      audioContextRef.current = ctx
      
      // Create master gain node
      masterGainRef.current = ctx.createGain()
      masterGainRef.current.gain.value = 0.25 // Master volume
      
      // Create low-pass filter to tame harsh highs
      filterRef.current = ctx.createBiquadFilter()
      filterRef.current.type = 'lowpass'
      filterRef.current.frequency.value = 3000
      filterRef.current.Q.value = 0.5
      
      // Connect filter -> master gain -> destination
      filterRef.current.connect(masterGainRef.current)
      masterGainRef.current.connect(ctx.destination)
    }
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    return ctx
  }, [])

  /**
   * Internal function to play a note at a specific time
   */
  const playNoteAtTime = useCallback((midi: number, startTime: number) => {
    const ctx = getAudioContext()
    const filter = filterRef.current
    if (!filter) return
    
    // If this note is already playing, stop it first
    if (activeOscillatorsRef.current.has(midi)) {
      stopNoteAtTime(midi, startTime)
    }
    
    // Create oscillator
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sawtooth'
    oscillator.frequency.value = midiToFrequency(midi)
    
    // Create envelope gain node
    const gainNode = ctx.createGain()
    gainNode.gain.value = 0
    
    // Connect oscillator -> gain -> filter (which is already connected to master -> destination)
    oscillator.connect(gainNode)
    gainNode.connect(filter)
    
    // Start oscillator at scheduled time
    oscillator.start(startTime)
    
    // Apply attack envelope (~10ms) at scheduled time
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.01)
    
    // Store for later
    activeOscillatorsRef.current.set(midi, { oscillator, gainNode })
  }, [getAudioContext])

  /**
   * Internal function to stop a note at a specific time
   */
  const stopNoteAtTime = useCallback((midi: number, stopTime: number) => {
    const active = activeOscillatorsRef.current.get(midi)
    if (!active) return
    
    const ctx = audioContextRef.current
    if (!ctx) return
    
    const { oscillator, gainNode } = active
    
    // Apply release envelope (~50ms) at scheduled time
    gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime)
    gainNode.gain.linearRampToValueAtTime(0, stopTime + 0.05)
    
    // Schedule oscillator to stop after release
    try {
      oscillator.stop(stopTime + 0.06)
    } catch {
      // Ignore if already stopped
    }
    
    // Clean up after scheduled stop
    const msUntilStop = Math.max(0, (stopTime - ctx.currentTime) * 1000) + 100
    setTimeout(() => {
      try {
        oscillator.disconnect()
        gainNode.disconnect()
      } catch {
        // Ignore errors if already disconnected
      }
    }, msUntilStop)
    
    activeOscillatorsRef.current.delete(midi)
  }, [])

  /**
   * Play a note immediately (for UI feedback when drawing)
   */
  const playNote = useCallback((midi: number) => {
    const ctx = getAudioContext()
    playNoteAtTime(midi, ctx.currentTime)
  }, [getAudioContext, playNoteAtTime])

  /**
   * Play a note at a specific scheduled time (for synced playback)
   */
  const playNoteAt = useCallback((midi: number, scheduledTime: number) => {
    playNoteAtTime(midi, scheduledTime)
  }, [playNoteAtTime])

  /**
   * Stop a note immediately
   */
  const stopNote = useCallback((midi: number) => {
    const active = activeOscillatorsRef.current.get(midi)
    if (!active) return
    
    const ctx = audioContextRef.current
    if (!ctx) return
    
    const { oscillator, gainNode } = active
    
    // Apply release envelope (~50ms)
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.05)
    
    // Stop and clean up after release
    setTimeout(() => {
      try {
        oscillator.stop()
        oscillator.disconnect()
        gainNode.disconnect()
      } catch {
        // Ignore errors if already stopped
      }
    }, 60)
    
    activeOscillatorsRef.current.delete(midi)
  }, [])

  /**
   * Stop a note at a specific scheduled time
   */
  const stopNoteAt = useCallback((midi: number, scheduledTime: number) => {
    stopNoteAtTime(midi, scheduledTime)
  }, [stopNoteAtTime])

  const stopAllNotes = useCallback(() => {
    activeOscillatorsRef.current.forEach((_, midi) => {
      stopNote(midi)
    })
  }, [stopNote])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all oscillators
      activeOscillatorsRef.current.forEach(({ oscillator, gainNode }) => {
        try {
          oscillator.stop()
          oscillator.disconnect()
          gainNode.disconnect()
        } catch {
          // Ignore errors
        }
      })
      activeOscillatorsRef.current.clear()
      
      // Disconnect our processing chain (but don't close the shared audio context)
      try {
        masterGainRef.current?.disconnect()
        filterRef.current?.disconnect()
      } catch {
        // Ignore errors if already disconnected
      }
      masterGainRef.current = null
      filterRef.current = null
      audioContextRef.current = null
    }
  }, [])

  return { playNote, playNoteAt, stopNote, stopNoteAt, stopAllNotes }
}

