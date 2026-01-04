import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioLines } from 'lucide-react'
import { Button } from '../../components/ui/button'
import {
  createPitchDetector,
  frequencyToMidi,
  midiToNoteName,
  midiToDisplayName,
  processRecording,
  trimLeadingSilence,
  NoteEvent,
  PitchSample,
  SAMPLE_HISTORY_SIZE,
  createPitchSmoother,
  PitchSmootherInstance,
  calculateRMS,
  MIN_AMPLITUDE_THRESHOLD,
  DEFAULT_CYCLE_MS,
  MAX_CYCLES,
} from './pitchDetection'
import { CycleInfo } from '../../components/StrudelEditor'

interface MelodyInputProps {
  onMelodyCapture: (notation: string) => void
  disabled: boolean
  isPlaying?: boolean
  getCycleInfo?: () => CycleInfo | null
}

const MelodyInput = ({ onMelodyCapture, disabled, isPlaying = false, getCycleInfo }: MelodyInputProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [currentMidi, setCurrentMidi] = useState<number | null>(null)
  const [recordingCycle, setRecordingCycle] = useState<number>(0)
  const [cyclePhase, setCyclePhase] = useState<number>(0)
  
  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const pitchDetectorRef = useRef<ReturnType<typeof createPitchDetector> | null>(null)
  const pitchSmootherRef = useRef<PitchSmootherInstance | null>(null)
  
  // Refs for recording data
  const noteEventsRef = useRef<NoteEvent[]>([])
  const currentNoteRef = useRef<{ midi: number; startMs: number } | null>(null)
  const recordingStartRef = useRef<number>(0)
  const pitchSamplesRef = useRef<PitchSample[]>([])
  const currentMidiRef = useRef<number | null>(null) // Track current MIDI without re-renders
  const lastStateUpdateRef = useRef<number>(0) // Throttle state updates
  const lastRmsRef = useRef<number>(0) // Track RMS for note onset detection
  const wasInSilenceRef = useRef<boolean>(true) // Track if we were in silence (for detecting new note onsets)
  
  // Cycle-aware recording refs
  const cycleDurationMsRef = useRef<number>(DEFAULT_CYCLE_MS)
  const isPlayingRef = useRef<boolean>(false)
  const cyclePhaseIntervalRef = useRef<number | null>(null)
  
  // Refs to avoid stale closures in callbacks
  const isRecordingRef = useRef<boolean>(false)
  const recordingCycleRef = useRef<number>(0)
  
  // Canvas ref for visualization
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Update refs when props change
  useEffect(() => {
    isPlayingRef.current = isPlaying
    if (getCycleInfo) {
      const info = getCycleInfo()
      if (info) {
        cycleDurationMsRef.current = info.cycleDurationMs
      }
    }
  }, [isPlaying, getCycleInfo])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Create pitch detector with the ACTUAL sample rate from AudioContext
      pitchDetectorRef.current = createPitchDetector(audioContext.sampleRate)
      
      // Create/reset pitch smoother (balanced: responsive but filters jitter)
      pitchSmootherRef.current = createPitchSmoother(5)

      // Create source and processor
      const source = audioContext.createMediaStreamSource(stream)
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1)
      scriptProcessorRef.current = scriptProcessor

      // Reset recording state
      noteEventsRef.current = []
      currentNoteRef.current = null
      pitchSamplesRef.current = []
      recordingStartRef.current = performance.now()
      wasInSilenceRef.current = true // Start assuming silence
      lastRmsRef.current = 0
      
      // Get cycle duration from current playback if available
      if (getCycleInfo) {
        const info = getCycleInfo()
        if (info) {
          cycleDurationMsRef.current = info.cycleDurationMs
        }
      }
      
      setRecordingCycle(0)
      recordingCycleRef.current = 0

      // Process audio frames
      // Note: We throttle React state updates to avoid blocking audio processing
      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        const float32Array = new Float32Array(inputData)
        
        // Check amplitude threshold (amplitude gating)
        const rms = calculateRMS(float32Array)
        
        const now = performance.now()
        const elapsedMs = now - recordingStartRef.current
        
        // Update current recording cycle (use ref to avoid stale closure)
        const currentCycle = Math.floor(elapsedMs / cycleDurationMsRef.current)
        if (currentCycle !== recordingCycleRef.current && currentCycle < MAX_CYCLES) {
          recordingCycleRef.current = currentCycle
          setRecordingCycle(currentCycle)
        }
        
        let pitch: number | null = null
        if (rms >= MIN_AMPLITUDE_THRESHOLD) {
          pitch = pitchDetectorRef.current?.(float32Array) ?? null
        }

        // Detect note onset using silence-based detection only
        // Relative dip detection was too noisy and created false splits
        const NOTE_ONSET_THRESHOLD = 0.025 // RMS threshold for detecting new note onset
        const SILENCE_THRESHOLD = 0.015 // RMS threshold to consider silence (lower = more sensitive)
        const wasInSilence = wasInSilenceRef.current
        const isNowSounding = rms >= NOTE_ONSET_THRESHOLD
        
        // Track silence transitions - require sustained low RMS
        if (rms < SILENCE_THRESHOLD) {
          wasInSilenceRef.current = true
        }
        
        // New onset only when transitioning from silence to sound
        const isNewOnset = wasInSilence && isNowSounding
        
        if (isNowSounding) {
          wasInSilenceRef.current = false
        }
        lastRmsRef.current = rms

        if (pitch && pitch > 50 && pitch < 2000) {
          const rawMidi = frequencyToMidi(pitch)
          
          // Apply pitch smoothing
          const smoothedMidi = pitchSmootherRef.current?.process(rawMidi, elapsedMs) ?? null
          
          if (smoothedMidi !== null) {
            currentMidiRef.current = smoothedMidi
            
            // Add to pitch samples for visualization
            pitchSamplesRef.current.push({ midi: smoothedMidi, timestamp: elapsedMs })
            if (pitchSamplesRef.current.length > SAMPLE_HISTORY_SIZE) {
              pitchSamplesRef.current.shift()
            }

            // Track note changes (use smoothed midi)
            // Also detect new note onset from silence (for repeated same-pitch notes)
            if (!currentNoteRef.current) {
              // Start new note
              currentNoteRef.current = { midi: smoothedMidi, startMs: elapsedMs }
            } else if (Math.abs(currentNoteRef.current.midi - smoothedMidi) >= 1) {
              // Note changed - save previous and start new
              noteEventsRef.current.push({
                note: midiToNoteName(currentNoteRef.current.midi),
                midi: currentNoteRef.current.midi,
                startMs: currentNoteRef.current.startMs,
                endMs: elapsedMs,
              })
              currentNoteRef.current = { midi: smoothedMidi, startMs: elapsedMs }
            } else if (isNewOnset && currentNoteRef.current.midi === smoothedMidi) {
              // Same pitch but new onset (after silence) - this is a repeated note!
              // Only split if current note is at least 100ms long
              if (elapsedMs - currentNoteRef.current.startMs > 100) {
                noteEventsRef.current.push({
                  note: midiToNoteName(currentNoteRef.current.midi),
                  midi: currentNoteRef.current.midi,
                  startMs: currentNoteRef.current.startMs,
                  endMs: elapsedMs - 50, // End slightly before the new onset
                })
                currentNoteRef.current = { midi: smoothedMidi, startMs: elapsedMs }
              }
            }
            
            // Throttle React state updates to ~10fps to avoid blocking audio
            if (now - lastStateUpdateRef.current > 100) {
              lastStateUpdateRef.current = now
              setCurrentMidi(smoothedMidi)
            }
          }
        } else {
          // No pitch detected (or below amplitude threshold, or garbage 19kHz)
          const smoothedMidi = pitchSmootherRef.current?.process(null, elapsedMs) ?? null
          currentMidiRef.current = smoothedMidi
          
          // If holdover returned a pitch, use it for visualization and continue note tracking
          if (smoothedMidi !== null) {
            pitchSamplesRef.current.push({ midi: smoothedMidi, timestamp: elapsedMs })
            if (pitchSamplesRef.current.length > SAMPLE_HISTORY_SIZE) {
              pitchSamplesRef.current.shift()
            }
            // Holdover - don't end the current note
            // Throttle React state updates
            if (now - lastStateUpdateRef.current > 100) {
              lastStateUpdateRef.current = now
              setCurrentMidi(smoothedMidi)
            }
            return // Skip the rest of the else block
          }
          
          pitchSamplesRef.current.push({ midi: null, timestamp: elapsedMs })
          if (pitchSamplesRef.current.length > SAMPLE_HISTORY_SIZE) {
            pitchSamplesRef.current.shift()
          }

          // End current note if there was one
          if (currentNoteRef.current) {
            noteEventsRef.current.push({
              note: midiToNoteName(currentNoteRef.current.midi),
              midi: currentNoteRef.current.midi,
              startMs: currentNoteRef.current.startMs,
              endMs: elapsedMs,
            })
            currentNoteRef.current = null
          }
          
          // Throttle React state updates
          if (now - lastStateUpdateRef.current > 100) {
            lastStateUpdateRef.current = now
            setCurrentMidi(null)
          }
        }
      }

      source.connect(scriptProcessor)
      scriptProcessor.connect(audioContext.destination)

      // Set recording state (update ref first for callbacks, then state for UI)
      isRecordingRef.current = true
      setIsRecording(true)
      startVisualization()
      startCyclePhaseUpdate()
    } catch (error) {
      console.error('Failed to start recording:', error)
      console.error('Could not access microphone. Please grant permission and try again.')
    }
  }, [getCycleInfo])

  // Update cycle phase indicator
  const startCyclePhaseUpdate = useCallback(() => {
    const update = () => {
      // Use ref to avoid stale closure (isRecording state would be stale)
      if (!isRecordingRef.current) return
      
      if (getCycleInfo && isPlayingRef.current) {
        const info = getCycleInfo()
        if (info) {
          setCyclePhase(info.phase)
        }
      } else {
        // Calculate phase from recording time when not playing
        const elapsedMs = performance.now() - recordingStartRef.current
        const phase = (elapsedMs % cycleDurationMsRef.current) / cycleDurationMsRef.current
        setCyclePhase(phase)
      }
    }
    
    cyclePhaseIntervalRef.current = window.setInterval(update, 50)
  }, [getCycleInfo])

  // Stop recording and process
  const stopRecording = useCallback(() => {
    const endTime = performance.now()
    const totalDurationMs = endTime - recordingStartRef.current

    // End any ongoing note
    if (currentNoteRef.current) {
      noteEventsRef.current.push({
        note: midiToNoteName(currentNoteRef.current.midi),
        midi: currentNoteRef.current.midi,
        startMs: currentNoteRef.current.startMs,
        endMs: totalDurationMs,
      })
      currentNoteRef.current = null
    }

    // Clean up audio resources
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Stop cycle phase updates
    if (cyclePhaseIntervalRef.current) {
      clearInterval(cyclePhaseIntervalRef.current)
      cyclePhaseIntervalRef.current = null
    }

    // Update refs first (for callbacks), then state (for UI)
    isRecordingRef.current = false
    recordingCycleRef.current = 0
    setIsRecording(false)
    setCurrentMidi(null)
    setRecordingCycle(0)
    setCyclePhase(0)

    // Trim leading silence (cycle-aware)
    const { events: trimmedEvents, effectiveDurationMs } = trimLeadingSilence(
      noteEventsRef.current,
      totalDurationMs,
      cycleDurationMsRef.current
    )
    
    // Check minimum recording length
    if (effectiveDurationMs < 500) {
      // Too short, discard
      return
    }

    // Process the recorded notes with multi-cycle support
    const notation = processRecording(
      trimmedEvents, 
      effectiveDurationMs,
      cycleDurationMsRef.current
    )
    
    // Only capture if we got actual notes
    if (notation && notation !== '~') {
      onMelodyCapture(notation)
    }
  }, [onMelodyCapture])

  // Visualization loop
  const startVisualization = useCallback(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const width = canvas.width
      const height = canvas.height
      const samples = pitchSamplesRef.current
      const cycleDurationMs = cycleDurationMsRef.current
      const elapsedMs = performance.now() - recordingStartRef.current
      // Calculate cycle position (used for wrapping visualization)
      void Math.floor(elapsedMs / cycleDurationMs)

      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)' // slate-900
      ctx.fillRect(0, 0, width, height)

      // Calculate pitch range from samples
      const validSamples = samples.filter(s => s.midi !== null) as { midi: number; timestamp: number }[]
      
      let minMidi = 48 // C3
      let maxMidi = 72 // C5
      
      if (validSamples.length > 0) {
        const midiValues = validSamples.map(s => s.midi)
        const sampleMin = Math.min(...midiValues)
        const sampleMax = Math.max(...midiValues)
        // Add padding and clamp to reasonable range
        minMidi = Math.max(36, Math.min(sampleMin - 4, minMidi))
        maxMidi = Math.min(96, Math.max(sampleMax + 4, maxMidi))
        // Ensure at least 12 semitones visible
        if (maxMidi - minMidi < 12) {
          const mid = (minMidi + maxMidi) / 2
          minMidi = Math.floor(mid - 6)
          maxMidi = Math.ceil(mid + 6)
        }
      }

      const midiRange = maxMidi - minMidi
      const pianoLabelWidth = 40

      // Draw piano labels and grid lines
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      // Use ref for real-time display (not throttled state)
      const liveCurrentMidi = currentMidiRef.current
      
      for (let midi = minMidi; midi <= maxMidi; midi++) {
        const y = height - ((midi - minMidi) / midiRange) * height
        const noteName = midiToDisplayName(midi)
        const isNatural = !noteName.includes('#')
        const isCurrentNote = liveCurrentMidi !== null && midi === liveCurrentMidi
        
        // Draw grid line
        ctx.strokeStyle = isNatural ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.15)'
        ctx.beginPath()
        ctx.moveTo(pianoLabelWidth, y)
        ctx.lineTo(width, y)
        ctx.stroke()

        // Draw note label (only naturals to avoid clutter, or current note)
        if (isNatural || isCurrentNote) {
          ctx.fillStyle = isCurrentNote ? '#fbbf24' : 'rgba(148, 163, 184, 0.7)'
          ctx.fillText(noteName, pianoLabelWidth - 5, y)
        }
      }

      // Draw cycle boundary markers (vertical lines)
      const graphWidth = width - pianoLabelWidth
      const now = performance.now() - recordingStartRef.current
      const timeWindowMs = 3000 // 3 seconds visible
      const centerX = pianoLabelWidth + graphWidth / 2
      
      // Draw cycle boundaries
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      
      for (let c = 0; c <= MAX_CYCLES; c++) {
        const cycleTimeMs = c * cycleDurationMs
        const relativeTime = cycleTimeMs - now
        const x = centerX + (relativeTime / timeWindowMs) * graphWidth
        
        if (x >= pianoLabelWidth && x <= width) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
          
          // Label cycle number
          if (c < MAX_CYCLES) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.6)'
            ctx.font = '9px monospace'
            ctx.textAlign = 'left'
            ctx.fillText(`C${c + 1}`, x + 3, 12)
          }
        }
      }

      // Draw pitch contour
      if (samples.length > 1) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()

        let hasStarted = false
        let lastValidY: number | null = null

        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i]
          const relativeTime = sample.timestamp - now
          const x = centerX + (relativeTime / timeWindowMs) * graphWidth

          if (x < pianoLabelWidth || x > width) continue

          if (sample.midi !== null) {
            const y = height - ((sample.midi - minMidi) / midiRange) * height

            if (!hasStarted) {
              ctx.moveTo(x, y)
              hasStarted = true
            } else if (lastValidY === null) {
              // Coming from a gap - move to new position
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
            lastValidY = y
          } else {
            lastValidY = null
          }
        }

        ctx.stroke()

        // Draw current pitch indicator
        if (liveCurrentMidi !== null) {
          const y = height - ((liveCurrentMidi - minMidi) / midiRange) * height
          
          // Glow effect
          ctx.shadowColor = '#fbbf24'
          ctx.shadowBlur = 10
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.arc(centerX, y, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // Draw center line indicator
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(centerX, 0)
      ctx.lineTo(centerX, height)
      ctx.stroke()
      ctx.setLineDash([])

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    animationFrameRef.current = requestAnimationFrame(draw)
  }, []) // Uses refs for real-time data, no state dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (cyclePhaseIntervalRef.current) {
        clearInterval(cyclePhaseIntervalRef.current)
      }
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Handle pointer events for press-and-hold
  // Using pointer capture ensures recording continues even if pointer leaves the button
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (!disabled) {
      // Capture pointer so we get pointerup even if mouse moves away
      (e.target as HTMLElement).setPointerCapture(e.pointerId)
      startRecording()
    }
  }, [disabled, startRecording])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    // Release pointer capture
    if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    }
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  // Also handle pointercancel for edge cases (e.g., system interrupts)
  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  return (
    <>
      {/* Press-and-hold melody button */}
      <div className="relative flex-shrink-0">
        {isRecording && (
          <div className="absolute inset-2 rounded-full bg-amber-500 animate-ping opacity-75"></div>
        )}
        <Button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseDown={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          disabled={disabled}
          className={
            isRecording
              ? "relative rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-600 hover:to-amber-700 text-white shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse touch-none select-none"
              : "relative rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900 hover:from-amber-600 hover:via-amber-800 hover:to-black text-white touch-none select-none"
          }
          style={{ touchAction: 'none' }}
        >
          <AudioLines className="h-5 w-5" />
        </Button>
      </div>

      {/* Pitch graph overlay */}
      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-slate-600/50 rounded-xl shadow-2xl p-4 pointer-events-auto animate-in zoom-in-95 duration-200">
            <div className="text-center mb-2">
              <span className="text-amber-400 font-mono text-sm">
                ♪ Hum your melody...
              </span>
              {currentMidi !== null && (
                <span className="ml-2 text-white font-mono text-sm">
                  {midiToDisplayName(currentMidi)}
                </span>
              )}
            </div>
            
            {/* Cycle progress indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-400 font-mono text-xs">
                Cycle {recordingCycle + 1}/{MAX_CYCLES}
              </span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-50"
                  style={{ width: `${cyclePhase * 100}%` }}
                />
              </div>
            </div>
            
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="rounded-lg"
            />
            <div className="text-center mt-2 text-slate-400 font-mono text-xs">
              Release to capture melody
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MelodyInput

