/**
 * EXPERIMENTAL: Hum-to-Melody Pitch Detection Feature
 * 
 * This module provides pitch detection for converting hummed melodies
 * into Strudel mini-notation. It's currently experimental and disabled
 * by default.
 * 
 * To enable:
 * 1. Uncomment the MelodyInput import in HomePage.tsx
 * 2. Uncomment the <MelodyInput> component in the input bar
 * 3. Uncomment the handleMelodyCapture callback
 * 
 */

export { default as MelodyInput } from './MelodyInput'
export * from './pitchDetection'

