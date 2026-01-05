import { useCallback } from 'react'
import { DrumSound } from '../../lib/sequencer/types'

// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { superdough } from 'superdough'
// Import getAudioContext from the same place StrudelEditor uses for consistency
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { getAudioContext } from '@strudel/webaudio'

interface UseDrumPreviewReturn {
  /**
   * Play a drum sound immediately (for UI feedback when drawing notes)
   */
  playDrum: (drumSound: DrumSound) => void
  /**
   * Play a drum sound at a specific scheduled time (for synced playback)
   * @param drumSound - The drum sound to play
   * @param scheduledTime - Audio context time when the sound should play
   */
  playDrumAt: (drumSound: DrumSound, scheduledTime: number) => void
}

/**
 * Hook for drum sample preview playback using superdough's trigger API.
 * Uses the same samples that Strudel loads during prebake.
 */
export const useDrumPreview = (): UseDrumPreviewReturn => {
  /**
   * Play a drum at a specific audio context time.
   * Used for synced playback with Strudel.
   */
  const playDrumAt = useCallback((drumSound: DrumSound, scheduledTime: number) => {
    const ac = getAudioContext()
    
    // Ensure audio context is running (browsers suspend it until user interaction)
    if (ac.state === 'suspended') {
      ac.resume()
    }

    // Use superdough directly - it handles connecting to audio output
    // Drums are one-shot, use a reasonable duration for the sample to play
    superdough({
      s: drumSound,
      n: 0,           // First sample in bank
      gain: 0.8,      // Volume
    }, scheduledTime, 1)  // scheduledTime = when to play, 1 second hapDuration
  }, [])

  /**
   * Play a drum immediately with Strudel's latency offset.
   * Used for UI feedback when drawing notes on the grid.
   */
  const playDrum = useCallback((drumSound: DrumSound) => {
    const ac = getAudioContext()
    
    // Ensure audio context is running
    if (ac.state === 'suspended') {
      ac.resume()
    }

    // Schedule with minimal delay for immediate feedback
    // We use a small offset (not STRUDEL_LATENCY_S) because this is for 
    // UI feedback, not synced playback
    const t = ac.currentTime + 0.005
    
    superdough({
      s: drumSound,
      n: 0,
      gain: 0.8,
    }, t, 1)
  }, [])

  return { playDrum, playDrumAt }
}

