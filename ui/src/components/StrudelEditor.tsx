import { useEffect, useRef, useState } from 'react'
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { StrudelMirror } from '@strudel/codemirror'
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { evalScope, noteToMidi, valueToMidi, Pattern } from '@strudel/core'
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { initAudioOnFirstClick, getAudioContext, webaudioOutput, registerSynthSounds, registerZZFXSounds, aliasBank } from '@strudel/webaudio'
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { registerSoundfonts } from '@strudel/soundfonts'
// @ts-expect-error - Strudel packages don't have TypeScript declarations
import { transpiler } from '@strudel/transpiler'
import { undo, redo } from '@codemirror/commands'

interface StrudelEditorProps {
  initialCode: string
  onCodeChange?: (code: string) => void
  onPlayReady?: (playFn: () => void) => void
  onStopReady?: (stopFn: () => void) => void
  onGetCurrentCode?: (getCurrentCodeFn: () => string) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onAnalyserReady?: (analyser: AnalyserNode) => void
  onInitStateChange?: (isInitialized: boolean, isInitializing: boolean) => void
  onUndoReady?: (undoFn: () => void) => void
  onRedoReady?: (redoFn: () => void) => void
  onClearReady?: (clearFn: () => void) => void
}

const StrudelEditor = ({ initialCode, onCodeChange, onPlayReady, onStopReady, onGetCurrentCode, onPlayStateChange, onAnalyserReady, onInitStateChange, onUndoReady, onRedoReady, onClearReady }: StrudelEditorProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)
  const strudelMirrorRef = useRef<{
    code: string
    evaluate: () => Promise<void>
    stop: () => Promise<void>
    toggle: () => Promise<void>
    setCode: (code: string) => void
    clear: () => void
    onEval?: () => void
    editor?: any
  } | null>(null)
  const initializationRef = useRef(false) // Prevent double initialization
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    // Initialize StrudelMirror when component mounts - only once
    // Prevents React StrictMode double initialization
    if (initializationRef.current || isInitialized || isInitializing) {
      return
    }
    
    if (!editorRef.current || strudelMirrorRef.current) {
      return
    }
    
    initializationRef.current = true
    setIsInitializing(true)
    
    const init = async () => {
        try {
          console.log('[STRUDEL INIT] Starting initialization...')
          
          // Clear any existing content in the editor div
          if (editorRef.current) {
            editorRef.current.innerHTML = ''
            
            // CRITICAL: Override CSS variables that CodeMirror uses for backgrounds
            editorRef.current.style.setProperty('--background', 'transparent')
            editorRef.current.style.setProperty('--cm-background', 'transparent')
            editorRef.current.style.setProperty('--cm-gutters-background', 'transparent')
          }
          
          // Initialize audio context
          initAudioOnFirstClick()
          await new Promise(resolve => setTimeout(resolve, 50))
          
          const context = getAudioContext()
          
          // Create analyser for visualization
          const analyser = context.createAnalyser()
          analyser.fftSize = 1024
          analyser.smoothingTimeConstant = 0.7
          analyserRef.current = analyser
          
          // CRITICAL: Monkey-patch AudioNode.prototype.connect to intercept all audio
          // This allows us to tap into Strudel's audio without modifying its code
          const originalConnect = AudioNode.prototype.connect;
          
          (AudioNode.prototype.connect as any) = function(this: AudioNode, ...args: any[]) {
            const result = (originalConnect as any).apply(this, args)
            
            // If any node connects to destination, also connect to our analyser
            if (args[0] === context.destination && analyser) {
              try {
                (originalConnect as any).call(this, analyser)
              } catch (err) {
                // Silently ignore if connection fails
              }
            }
            
            return result
          }
          
          console.log('[AUDIO] Analyser ready')
          
          // Expose analyser to parent
          if (onAnalyserReady) {
            onAnalyserReady(analyser)
          }
          
          // Create StrudelMirror instance
          const editor = new StrudelMirror({
            defaultOutput: webaudioOutput,
            getTime: () => getAudioContext().currentTime,
            transpiler,
            root: editorRef.current!,
            initialCode: initialCode,
            prebake: async () => {
              initAudioOnFirstClick()
              const loadModules = evalScope(
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/core'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/draw'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/mini'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/tonal'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/webaudio'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('@strudel/soundfonts'),
                // @ts-expect-error - Strudel packages don't have TypeScript declarations
                import('superdough'),
              )
              
              // Wait for modules to load first
              await loadModules
              
              // Import samples function from superdough module
              // @ts-expect-error - Strudel packages don't have TypeScript declarations
              const { samples } = await import('superdough')
              
              // Load synth sounds, soundfonts, and all default samples in parallel
              // This matches what the standard strudel.cc REPL loads
              const ds = "https://raw.githubusercontent.com/felixroos/dough-samples/main/"
              const ts = "https://raw.githubusercontent.com/todepond/samples/main/"
              
              await Promise.all([
                registerSynthSounds(), 
                registerSoundfonts(),
                registerZZFXSounds(),
                
                // Drum machines with prebake flag and tag
                samples(`${ds}tidal-drum-machines.json`, 'github:ritchse/tidal-drum-machines/main/machines/', { 
                  prebake: true, 
                  tag: 'drum-machines' 
                }),
                
                // Piano samples
                samples(`${ds}piano.json`, undefined, { prebake: true }),
                
                // Default Tidal samples (bd, sd, hh, etc.)
                samples(`${ds}Dirt-Samples.json`, undefined, { prebake: true }),
                
                // Emu SP-12 samples
                samples(`${ds}EmuSP12.json`, undefined, { prebake: true }),
                
                // VCSL instrument samples
                samples(`${ds}vcsl.json`, 'github:sgossner/VCSL/master/', { prebake: true }),
                
                // Mridangam percussion samples
                samples(`${ds}mridangam.json`, undefined, { 
                  prebake: true, 
                  tag: 'drum-machines' 
                }),
                
                // UZU drumkit - additional high-quality drum samples
                samples({
                  bd: [
                    "bd/10_bd_switchangel.wav", "bd/11_bd_mot4i.wav", "bd/12_bd_mot4i.wav",
                    "bd/13_bd_mot4i.wav", "bd/14_bd_switchangel.wav", "bd/15_bd_switchangel.wav",
                    "bd/16_bd_switchangel.wav", "bd/17_bd_switchangel.wav"
                  ],
                  brk: ["brk/10_break_amen_pprocessed.wav"],
                  cb: ["cb/10_perc_switchangel.wav"],
                  cp: ["cp/10_cp_switchangel.wav", "cp/11_cp_mot4i.wav"],
                  cr: ["cr/10_cr_switchangel.wav", "cr/11_cr_mot4i.wav"],
                  hh: [
                    "hh/10_hh_switchangel.wav", "hh/11_hh_mot4i.wav", "hh/12_hh_switchangel.wav",
                    "hh/13_hh_switchangel.wav", "hh/14_hh_mot4i.wav"
                  ],
                  ht: ["ht/10_ht_mot4i.wav"],
                  lt: ["lt/10_lt_mot4i.wav"],
                  misc: [
                    "misc/10_misc_switchangel_ludens.wav", "misc/11_misc_switchangel_ludens.wav",
                    "misc/12_misc_switchangel_ludens.wav", "misc/13_misc_switchangel_ludens.wav",
                    "misc/14_misc_switchangel_ludens.wav"
                  ],
                  mt: ["mt/10_mt_mot4i.wav"],
                  oh: [
                    "oh/10_oh_switchangel.wav", "oh/11_oh_switchangel.wav",
                    "oh/12_oh_switchangel.wav", "oh/13_oh_switchangel.wav"
                  ],
                  rd: ["rd/10_rd_switchangel.wav"],
                  rim: ["rim/10_rim_switchangel.wav", "rim/11_rim_switch_angel.wav"],
                  sd: [
                    "sd/10_sd_switchangel-bounce-2.wav", "sd/11_sd_switchangel_3.wav",
                    "sd/12_sd_switchangel_2.wav", "sd/13_sd_switchangel_2.wav", "sd/14_sd.wav"
                  ],
                  sh: ["sh/10_sh_switchangel.wav"],
                  tb: ["tb/10_tb.wav"],
                }, 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main/', {
                  prebake: true,
                  tag: 'drum-machines',
                }),
                
                // UZU wavetables - wavetable samples for synthesis
                // Note: These are registered as samples, not wavetables, matching official Strudel behavior
                samples({
                  wt_digital: [
                    "wt_digital/wt_bad_day.wav", "wt_digital/wt_basique.wav",
                    "wt_digital/wt_crickets.wav", "wt_digital/wt_curses.wav",
                    "wt_digital/wt_echoes.wav"
                  ],
                  wt_digital_bad_day: ["wt_digital/wt_bad_day.wav"],
                  wt_digital_basique: ["wt_digital/wt_basique.wav"],
                  wt_digital_crickets: ["wt_digital/wt_crickets.wav"],
                  wt_digital_curses: ["wt_digital/wt_curses.wav"],
                  wt_digital_echoes: ["wt_digital/wt_echoes.wav"],
                  wt_vgame: [
                    "wt_vgame/wt_vgame10.wav", "wt_vgame/wt_vgame11.wav",
                    "wt_vgame/wt_vgame12.wav", "wt_vgame/wt_vgame13.wav",
                    "wt_vgame/wt_vgame14.wav", "wt_vgame/wt_vgame15.wav",
                    "wt_vgame/wt_vgame16.wav", "wt_vgame/wt_vgame17.wav",
                    "wt_vgame/wt_vgame18.wav", "wt_vgame/wt_vgame19.wav",
                    "wt_vgame/wt_vgame20.wav"
                  ]
                }, 'https://raw.githubusercontent.com/tidalcycles/uzu-wavetables/main/', {
                  prebake: true,
                }),
                
                // GitHub sample packs
                samples('github:tidalcycles/dirt-samples', undefined, { prebake: true }),
                samples('github:yaxu/clean-breaks', undefined, { prebake: true }),
              ])
              
              // Load alias bank for drum machines
              
              aliasBank(`${ts}tidal-drum-machines-alias.json`)
            },
            onToggle: (started: boolean) => {
              setIsPlaying(started)
            },
            onEval: () => {
              // This will be updated via a separate effect
            },
          })

          strudelMirrorRef.current = editor
          
          // Enable tab indentation in the editor
          editor.reconfigureExtension('isTabIndentationEnabled', true)
          
          setIsInitialized(true)
          setError(null)
          
          // Expose play function to parent
          if (onPlayReady) {
            onPlayReady(() => {
              if (strudelMirrorRef.current) {
                strudelMirrorRef.current.evaluate()
              }
            })
          }
          
          // Expose stop function to parent
          if (onStopReady) {
            onStopReady(() => {
              if (strudelMirrorRef.current) {
                strudelMirrorRef.current.stop()
                setIsPlaying(false)
              }
            })
          }
          
          // Expose getCurrentCode function to parent
          if (onGetCurrentCode) {
            onGetCurrentCode(() => {
              return strudelMirrorRef.current?.code || ''
            })
          }
          
          // Expose undo function to parent
          if (onUndoReady) {
            onUndoReady(() => {
              if (strudelMirrorRef.current?.editor) {
                undo(strudelMirrorRef.current.editor)
              }
            })
          }
          
          // Expose redo function to parent
          if (onRedoReady) {
            onRedoReady(() => {
              if (strudelMirrorRef.current?.editor) {
                redo(strudelMirrorRef.current.editor)
              }
            })
          }
          
          // Expose clear function to parent
          if (onClearReady) {
            onClearReady(() => {
              if (strudelMirrorRef.current) {
                strudelMirrorRef.current.setCode('')
              }
            })
          }
        } catch (err) {
          console.error('Failed to initialize Strudel:', err)
          setError('Failed to initialize Strudel editor')
          initializationRef.current = false // Reset on error
        } finally {
          setIsInitializing(false)
        }
    }

    init()

    // Cleanup on unmount
    return () => {
      if (strudelMirrorRef.current) {
        try {
          strudelMirrorRef.current.stop?.()
          strudelMirrorRef.current.clear?.()
          strudelMirrorRef.current = null
        } catch (err) {
          console.warn('Error during cleanup:', err)
        }
      }
      // Don't reset initializationRef to prevent StrictMode double-init
    }
  }, [])

  // Update code when initialCode prop changes
  useEffect(() => {
    if (strudelMirrorRef.current && isInitialized && initialCode !== strudelMirrorRef.current.code) {
      strudelMirrorRef.current.setCode(initialCode)
    }
  }, [initialCode, isInitialized])

  // Update onCodeChange callback when it changes
  useEffect(() => {
    if (strudelMirrorRef.current && isInitialized && onCodeChange) {
      // Update the onEval callback
      const originalOnEval = strudelMirrorRef.current.onEval
      strudelMirrorRef.current.onEval = () => {
        if (strudelMirrorRef.current) {
          onCodeChange(strudelMirrorRef.current.code)
        }
      }
      
      return () => {
        if (strudelMirrorRef.current) {
          strudelMirrorRef.current.onEval = originalOnEval
        }
      }
    }
  }, [onCodeChange, isInitialized])

  // Notify parent when play state changes
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying)
    }
  }, [isPlaying, onPlayStateChange])

  // Notify parent when init state changes
  useEffect(() => {
    if (onInitStateChange) {
      onInitStateChange(isInitialized, isInitializing)
    }
  }, [isInitialized, isInitializing, onInitStateChange])

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-red-950/80 border border-red-800 p-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Editor Area - No container, no canvas, directly on background */}
      <div className="relative w-full">
        {/* StrudelMirror editor container with white text styling */}
        <div
          ref={editorRef}
          className="relative min-h-[450px] text-white font-mono"
          style={{
            background: 'transparent',
          }}
        />
      </div>
    </>
  )
}

export default StrudelEditor

