declare module 'pitchfinder' {
  interface PitchDetectorOptions {
    sampleRate?: number
    threshold?: number
    probabilityThreshold?: number
  }

  type PitchDetector = (input: Float32Array) => number | null

  interface Pitchfinder {
    YIN: (options?: PitchDetectorOptions) => PitchDetector
    AMDF: (options?: PitchDetectorOptions) => PitchDetector
    DynamicWavelet: (options?: PitchDetectorOptions) => PitchDetector
    Macleod: (options?: PitchDetectorOptions) => PitchDetector
  }

  const pitchfinder: Pitchfinder
  export default pitchfinder
}

