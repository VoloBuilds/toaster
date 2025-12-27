import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Loader2, Mic, MicOff, Play, Square, Share2, Check, Undo, Redo } from 'lucide-react'
import StrudelEditor from '../components/StrudelEditor'
import HalVisualization from '../components/HalVisualization'
import ClearButton from '../components/ClearButton'

// const DEFAULT_CODE = `// Welcome to Toaster! Try this example or generate your own with AI below.
// note("c3 e3 g3 c4").s("sine").lpf(800).room(.2).color("red")._scope()`

const DEFAULT_CODE = `
//Bass
$: note("<c1 g1 c2 g1>").s("sawtooth").lpf(300).lpenv(2).room(0.7).release(2).slow(4).gain(0.8)
.color("blue")._spectrum()
//Synth
$: note("c2 a2 eb2")
.euclid(5,8)
.s('sawtooth')
.lpenv(4).lpf(300)
.color("orange")._pianoroll()
//Drums
$: s("amen/4").fit().chop(32).color("red")._scope()`

const HomePage = () => {
  const [prompt, setPrompt] = useState('')
  const [strudelCode, setStrudelCode] = useState(DEFAULT_CODE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isEditorPlaying, setIsEditorPlaying] = useState(false)
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)
  const [isEditorInitializing, setIsEditorInitializing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)
  const editorPlayRef = useRef<(() => void) | null>(null)
  const editorStopRef = useRef<(() => void) | null>(null)
  const getCurrentCodeRef = useRef<(() => string) | null>(null)
  const editorUndoRef = useRef<(() => void) | null>(null)
  const editorRedoRef = useRef<(() => void) | null>(null)
  const editorClearRef = useRef<(() => void) | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const pauseTimerRef = useRef<number | null>(null)
  const currentTranscriptRef = useRef<string>('')
  const isListeningRef = useRef<boolean>(false)
  const audioAnalyserRef = useRef<AnalyserNode | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const isAndroid = /Android/.test(navigator.userAgent)

  // Handle dynamic viewport height for mobile (Android address bar, keyboard)
  useEffect(() => {
    const setViewportHeight = () => {
      // Use visualViewport if available, otherwise fall back to window.innerHeight
      const vh = window.visualViewport?.height || window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${vh}px`)
      document.documentElement.style.setProperty('--visual-viewport-height', `${vh}px`)
    }

    // Set initially
    setViewportHeight()

    // Update on resize (address bar, orientation change)
    window.addEventListener('resize', setViewportHeight)
    
    // Use visualViewport API if available (better for keyboard handling)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewportHeight)
      window.visualViewport.addEventListener('scroll', setViewportHeight)
    }

    return () => {
      window.removeEventListener('resize', setViewportHeight)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setViewportHeight)
        window.visualViewport.removeEventListener('scroll', setViewportHeight)
      }
    }
  }, [])

  // Check for shared pattern on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shareId = urlParams.get('share')
    
    if (shareId) {
      const loadSharedPattern = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/share/${shareId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.code) {
              setStrudelCode(data.code)
              // Remove the share param from URL without reloading
              window.history.replaceState({}, '', window.location.pathname)
            }
          }
        } catch (error) {
          console.error('Failed to load shared pattern:', error)
        }
      }
      loadSharedPattern()
    }
  }, [])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
    }
  }, [prompt])

  // Ensure input is visible when keyboard appears on mobile
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleFocus = () => {
      // Small delay to let keyboard animation start
      setTimeout(() => {
        // Scroll the textarea into view if it's not visible
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 300)
    }

    textarea.addEventListener('focus', handleFocus)
    return () => textarea.removeEventListener('focus', handleFocus)
  }, [])

  const handlePlayReady = useCallback((playFn: () => void) => {
    editorPlayRef.current = playFn
  }, [])

  const handleStopReady = useCallback((stopFn: () => void) => {
    editorStopRef.current = stopFn
  }, [])

  const handleGetCurrentCode = useCallback((getCurrentCodeFn: () => string) => {
    getCurrentCodeRef.current = getCurrentCodeFn
  }, [])

  const handleUndoReady = useCallback((undoFn: () => void) => {
    editorUndoRef.current = undoFn
  }, [])

  const handleRedoReady = useCallback((redoFn: () => void) => {
    editorRedoRef.current = redoFn
  }, [])

  const handleClearReady = useCallback((clearFn: () => void) => {
    editorClearRef.current = clearFn
  }, [])

  const handleClear = useCallback(() => {
    if (editorClearRef.current) {
      editorClearRef.current()
    }
  }, [])

  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    setIsEditorPlaying(isPlaying)
  }, [])

  const handleCodeChange = useCallback((code: string) => {
    setStrudelCode(code)
  }, [])

  const handleAnalyserReady = useCallback((analyser: AnalyserNode) => {
    audioAnalyserRef.current = analyser
  }, [])

  const handleInitStateChange = useCallback((isInitialized: boolean, isInitializing: boolean) => {
    setIsEditorInitialized(isInitialized)
    setIsEditorInitializing(isInitializing)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const modifierKey = isMac ? e.metaKey : e.ctrlKey
      
      if (modifierKey && e.key === '.') {
        e.preventDefault()
        if (editorStopRef.current) {
          editorStopRef.current()
        }
        return
      }
      
      if (modifierKey && e.key === 'Enter') {
        const activeElement = document.activeElement
        const isTextarea = activeElement?.tagName === 'TEXTAREA'
        
        if (!isTextarea || (isTextarea && !prompt.trim())) {
          e.preventDefault()
          if (editorPlayRef.current) {
            editorPlayRef.current()
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isMac, prompt])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      isListeningRef.current = true
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        currentTranscriptRef.current += finalTranscript
      }

      setPrompt(currentTranscriptRef.current + interimTranscript)

      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }

      pauseTimerRef.current = setTimeout(() => {
        const textToGenerate = currentTranscriptRef.current.trim()
        if (textToGenerate) {
          handleGenerateWithVoice(textToGenerate)
        }
      }, 2000)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (error) {
          console.error('Failed to restart speech recognition:', error)
          isListeningRef.current = false
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isListening) {
      isListeningRef.current = false
      recognitionRef.current.stop()
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
        pauseTimerRef.current = null
      }
      currentTranscriptRef.current = ''
      setIsListening(false)
    } else {
      currentTranscriptRef.current = ''
      setPrompt('')
      try {
        isListeningRef.current = true
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
      }
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      const currentCode = getCurrentCodeRef.current ? getCurrentCodeRef.current() : strudelCode
      const isDefaultCode = currentCode === DEFAULT_CODE
      const shouldSendPattern = !isDefaultCode || isEditorPlaying
      const patternToSend = shouldSendPattern ? currentCode : ''
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          currentPattern: patternToSend
        }),
      })

      const data = await response.json()
      setStrudelCode(data.code || '')
      setPrompt('')
      
      setTimeout(() => {
        if (editorPlayRef.current) {
          editorPlayRef.current()
        }
      }, 500)
    } catch (error) {
      console.error('Failed to generate music:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateWithVoice = async (textToGenerate: string) => {
    if (!textToGenerate.trim()) return

    setIsGenerating(true)
    try {
      const currentCode = getCurrentCodeRef.current ? getCurrentCodeRef.current() : strudelCode
      const isDefaultCode = currentCode === DEFAULT_CODE
      const shouldSendPattern = !isDefaultCode || isEditorPlaying
      const patternToSend = shouldSendPattern ? currentCode : ''
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: textToGenerate,
          currentPattern: patternToSend
        }),
      })

      const data = await response.json()
      setStrudelCode(data.code || '')
      currentTranscriptRef.current = ''
      setPrompt('')
      
      setTimeout(() => {
        if (editorPlayRef.current) {
          editorPlayRef.current()
        }
      }, 500)
    } catch (error) {
      console.error('Failed to generate music:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    setShareSuccess(false)
    setShowCopiedMessage(false)
    
    try {
      const currentCode = getCurrentCodeRef.current ? getCurrentCodeRef.current() : strudelCode
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode }),
      })

      const data = await response.json()
      
      if (data.url) {
        // Copy to clipboard
        await navigator.clipboard.writeText(data.url)
        
        // Show success feedback
        setShareSuccess(true)
        setShowCopiedMessage(true)
        setTimeout(() => {
          setShareSuccess(false)
          setShowCopiedMessage(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to share:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div 
      className="relative w-full bg-slate-950 overflow-hidden"
      style={{ 
        height: 'var(--app-height, 100vh)',
        maxHeight: 'var(--app-height, 100vh)'
      }}
    >
      {/* Full-screen HAL 9000 Visualization Background - Fixed position */}
      <div className="fixed inset-0 w-full h-full z-0">
        <HalVisualization 
          isPlaying={isEditorPlaying}
          isListening={isListening}
          audioAnalyser={audioAnalyserRef.current}
        />
      </div>

      {/* Main content container with flex layout */}
      <div 
        className="relative z-10 w-full flex flex-col"
        style={{ 
          height: 'var(--app-height, 100vh)',
          maxHeight: 'var(--app-height, 100vh)'
        }}
      >
        {/* TOASTER Header - Sticky at top, transparent to show background */}
        <div className="sticky top-0 z-30 pt-4 pb-3 text-center">
          <h1 className="text-red-500 font-mono text-3xl tracking-[0.5em] mr-[-0.5em] opacity-80 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            TOASTER
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-2 flex items-center justify-center gap-1 flex-wrap px-4">
            {isEditorInitializing
              ? 'INITIALIZING AUDIO ENGINE...'
              : isEditorInitialized
              ? (
                <>
                  <Play className="h-3 w-3 mx-1" />
                  {isMac ? 'CMD+ENTER // ' : 'CTRL+ENTER // '}
                  <Square className="h-3 w-3 mx-1" />
                  {isMac ? 'CMD+. // ' : 'CTRL+. // '}
                  <a 
                    href="https://youtu.be/Rhxc0NPakGE" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
                  >
                    ABOUT
                  </a>
                  {' // '}
                  <a 
                    href="https://strudel.cc/workshop/getting-started/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
                  >
                    STRUDEL
                  </a>
                </>
              )
              : 'AUDIO ENGINE OFFLINE'}
          </p>
        </div>

        {/* Strudel Editor - Scrollable middle section */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-32 pt-2">
          <div className="w-full">
            <StrudelEditor 
              key="strudel-editor"
              initialCode={strudelCode}
              onCodeChange={handleCodeChange}
              onPlayReady={handlePlayReady}
              onStopReady={handleStopReady}
              onGetCurrentCode={handleGetCurrentCode}
              onPlayStateChange={handlePlayStateChange}
              onAnalyserReady={handleAnalyserReady}
              onInitStateChange={handleInitStateChange}
              onUndoReady={handleUndoReady}
              onRedoReady={handleRedoReady}
              onClearReady={handleClearReady}
            />
          </div>
        </div>

        {/* Floating Control Bar - Fixed at bottom with safe area, overlays the code */}
        <div 
          className="fixed left-0 right-0 w-full px-0 sm:px-8 pb-0 sm:pb-8 z-40 pointer-events-none"
          style={{ 
            bottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Control buttons - Above input on mobile, integrated on desktop */}
            <div className="flex flex-col gap-2 mb-2 px-3 sm:px-0">
              {/* URL Copied message */}
              {showCopiedMessage && (
                <div className="text-xs font-mono text-green-400 text-right animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none">
                  URL Copied!
                </div>
              )}
              
              {/* Row 1: Share */}
              <div className="flex justify-end items-center gap-2">
                <Button
                  onClick={handleShare}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isSharing || !isEditorInitialized}
                  className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white pointer-events-auto"
                >
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : shareSuccess ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                  ) : (
                    <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
              
              {/* Row 2: Undo Redo Trash (left) and Play Stop (right) */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex gap-2 items-center">
                  <Button
                    onClick={() => editorUndoRef.current?.()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isEditorInitialized || isEditorInitializing}
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white pointer-events-auto"
                  >
                    <Undo className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>

                  <Button
                    onClick={() => editorRedoRef.current?.()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isEditorInitialized || isEditorInitializing}
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white pointer-events-auto"
                  >
                    <Redo className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>

                  <ClearButton
                    onClear={handleClear}
                    disabled={!isEditorInitialized || isEditorInitializing}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => editorPlayRef.current?.()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isEditorInitialized || isEditorInitializing}
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white pointer-events-auto"
                  >
                    {isEditorInitializing ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>

                  <Button
                    onClick={() => editorStopRef.current?.()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isEditorPlaying}
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white pointer-events-auto"
                  >
                    <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div className="bg-slate-950/95 border-0 sm:border border-slate-700/50 rounded-none sm:rounded-xl shadow-2xl p-3 sm:p-4 pointer-events-auto">
              <div className="flex gap-3 items-end">
                {/* Mic Button - Left (hidden on Android due to Web Speech API reliability issues) */}
                {!isAndroid && (
                  <div className="relative flex-shrink-0">
                    {isListening && (
                      <div className="absolute inset-2 rounded-full bg-red-500 animate-ping opacity-75"></div>
                    )}
                    <Button
                      onClick={toggleVoiceInput}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={isGenerating}
                      className={
                        isListening 
                          ? "relative rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 bg-gradient-to-br from-red-400 via-red-500 to-red-600 hover:from-red-500 hover:via-red-600 hover:to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse" 
                          : "relative rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 bg-gradient-to-br from-red-500 via-red-700 to-red-900 hover:from-red-600 hover:via-red-800 hover:to-black text-white"
                      }
                    >
                      {isListening ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                )}

                {/* AI Prompt Input with Send Button - Center */}
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Describe your sound..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Enter (without Shift)
                      if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isGenerating) {
                        e.preventDefault()
                        handleGenerate()
                      }
                    }}
                    rows={1}
                    className="w-full resize-none text-sm sm:text-base bg-slate-900/50 border-slate-600/50 text-slate-100 placeholder:text-slate-400 focus:border-slate-500 focus:ring-slate-500 font-mono py-3 pr-12 overflow-hidden"
                    style={{
                      minHeight: '44px',
                      maxHeight: '128px',
                    }}
                  />
                  
                  {/* Send Button - Inside input on right */}
                  <Button
                    onClick={handleGenerate}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!prompt.trim() || isGenerating}
                    className="absolute right-2 bottom-1.5 rounded-full w-8 h-8 p-0 flex items-center justify-center bg-transparent hover:bg-slate-700/50 border-0 text-slate-400 hover:text-white disabled:text-slate-700 disabled:hover:bg-transparent transition-colors"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage


