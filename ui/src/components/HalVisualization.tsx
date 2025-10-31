import { useEffect, useRef } from 'react'

interface HalVisualizationProps {
  isPlaying: boolean
  isListening: boolean
  audioAnalyser?: AnalyserNode | null
}

const HalVisualization = ({ isPlaying, isListening, audioAnalyser }: HalVisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const mirrorAnimationFrameRef = useRef<number | null>(null)
  const voiceAnalyserRef = useRef<AnalyserNode | null>(null)
  const voiceDataArrayRef = useRef<Uint8Array | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const strudelCanvasesRef = useRef<HTMLCanvasElement[]>([])
  const lastPlayingStateRef = useRef<boolean>(false)
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    size: number
  }>>([])
  

  // Initialize audio context and analyser for music playback
  // Use the analyser passed from parent (StrudelEditor)
  useEffect(() => {
    if (!isPlaying || !audioAnalyser) {
      analyserRef.current = null
      dataArrayRef.current = null
      return
    }

    analyserRef.current = audioAnalyser
    const bufferLength = audioAnalyser.frequencyBinCount
    dataArrayRef.current = new Uint8Array(bufferLength)
  }, [isPlaying, audioAnalyser])

  // Initialize voice input analysis
  useEffect(() => {
    if (!isListening) {
      // Clean up voice stream
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop())
        voiceStreamRef.current = null
      }
      voiceAnalyserRef.current = null
      voiceDataArrayRef.current = null
      return
    }

    const initVoiceAnalysis = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        voiceStreamRef.current = stream
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.7
        
        source.connect(analyser)
        voiceAnalyserRef.current = analyser
        
        const bufferLength = analyser.frequencyBinCount
        voiceDataArrayRef.current = new Uint8Array(bufferLength)
      } catch (error) {
        console.error('Failed to initialize voice analysis:', error)
      }
    }

    initVoiceAnalysis()

    return () => {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isListening])

  // Particle system
  const createParticles = (x: number, y: number, count: number, energy: number) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 0.5 + energy * 2
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        size: 2 + energy * 4
      })
    }
  }

  const updateParticles = () => {
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life++
      particle.vx *= 0.99
      particle.vy *= 0.99
      return particle.life < particle.maxLife
    })
  }

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) return

    let lastBeatTime = 0
    let beatThreshold = 200
    const beatHistory: number[] = []
    
    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2

      // Very subtle fade to keep particles trailing but let mirror show through
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'

      let bassEnergy = 0
      let midEnergy = 0
      let highEnergy = 0
      let voiceEnergy = 0
      let isBeat = false

      // Analyze music if playing
      if (isPlaying && analyserRef.current && dataArrayRef.current) {
        const dataArray = dataArrayRef.current
        analyserRef.current.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>)
        
        const bufferLength = dataArray.length
        
        // Split frequency ranges
        const bassEnd = Math.floor(bufferLength * 0.1)
        const midEnd = Math.floor(bufferLength * 0.4)
        
        // Calculate energy for different frequency ranges
        for (let i = 0; i < bassEnd; i++) {
          bassEnergy += dataArray[i]
        }
        bassEnergy /= bassEnd
        
        for (let i = bassEnd; i < midEnd; i++) {
          midEnergy += dataArray[i]
        }
        midEnergy /= (midEnd - bassEnd)
        
        for (let i = midEnd; i < bufferLength; i++) {
          highEnergy += dataArray[i]
        }
        highEnergy /= (bufferLength - midEnd)
        
        // Beat detection
        const currentEnergy = bassEnergy
        beatHistory.push(currentEnergy)
        if (beatHistory.length > 10) beatHistory.shift()
        
        const avgEnergy = beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length
        beatThreshold = avgEnergy * 1.4
        
        const now = Date.now()
        if (currentEnergy > beatThreshold && now - lastBeatTime > 300) {
          isBeat = true
          lastBeatTime = now
          createParticles(centerX, centerY, 8, bassEnergy / 255)
        }
      }

      // Analyze voice if listening
      if (isListening && voiceAnalyserRef.current && voiceDataArrayRef.current) {
        const voiceData = voiceDataArrayRef.current
        voiceAnalyserRef.current.getByteFrequencyData(voiceData as Uint8Array<ArrayBuffer>)
        
        let tempVoiceEnergy = 0
        for (let i = 0; i < voiceData.length; i++) {
          tempVoiceEnergy += voiceData[i]
        }
        voiceEnergy = tempVoiceEnergy / voiceData.length
        
        // Create particles on voice input
        if (voiceEnergy > 30) {
          if (Math.random() > 0.7) {
            createParticles(centerX, centerY, 3, voiceEnergy / 255)
          }
        }
      }

      // Normalize energy values
      bassEnergy = bassEnergy / 255
      midEnergy = midEnergy / 255
      highEnergy = highEnergy / 255
      voiceEnergy = voiceEnergy / 255

      // Calculate base size with pulsing
      const time = Date.now() / 1000
      const basePulse = Math.sin(time * 2) * 0.05 + 1
      // On narrow screens (mobile), use width more prominently for better scaling
      const aspectRatio = width / height
      const isNarrow = aspectRatio < 0.75 // Portrait/narrow mode
      const sizeBase = isNarrow ? width * 0.35 : Math.min(width, height) * 0.25
      const baseSize = sizeBase * basePulse
      
      // Add beat punch
      const beatPulse = isBeat ? 0.3 : 0
      const size = baseSize * (1 + bassEnergy * 0.5 + beatPulse + voiceEnergy * 0.4)

      // Draw outer glow rings
      const glowCount = 5
      for (let i = glowCount; i > 0; i--) {
        const glowSize = size * (1 + i * 0.15)
        const alpha = (0.15 / i) * (0.5 + bassEnergy * 0.5 + voiceEnergy * 0.3)
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize)
        gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`)
        gradient.addColorStop(0.5, `rgba(185, 28, 28, ${alpha * 0.5})`)
        gradient.addColorStop(1, `rgba(127, 29, 29, 0)`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(centerX, centerY, glowSize, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw main eye - red gradient
      const mainGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size)
      mainGradient.addColorStop(0, `rgba(239, 68, 68, ${0.9 + bassEnergy * 0.1})`)
      mainGradient.addColorStop(0.4, `rgba(220, 38, 38, ${0.95 + midEnergy * 0.05})`)
      mainGradient.addColorStop(0.7, `rgba(185, 28, 28, 0.9)`)
      mainGradient.addColorStop(1, `rgba(127, 29, 29, 0.7)`)
      
      ctx.fillStyle = mainGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2)
      ctx.fill()

      // Draw frequency rings (visual response to music)
      if (isPlaying && dataArrayRef.current) {
        const ringCount = 3
        for (let i = 0; i < ringCount; i++) {
          const ringSize = size * (0.5 + i * 0.15)
          const dataIndex = Math.floor((dataArrayRef.current.length / ringCount) * i)
          const value = dataArrayRef.current[dataIndex] / 255
          
          ctx.strokeStyle = `rgba(239, 68, 68, ${value * 0.6})`
          ctx.lineWidth = 2 + value * 3
          ctx.beginPath()
          ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Draw voice reactivity rings
      if (isListening && voiceEnergy > 0.1) {
        for (let i = 0; i < 4; i++) {
          // Scale rings further out from orb, especially when audio is playing
          const ringSize = size * (1.4 + i * 0.15)
          const alpha = voiceEnergy * (1 - i * 0.2)
          
          ctx.strokeStyle = `rgba(147, 51, 234, ${alpha})`
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Draw inner pupil with dynamic size
      const pupilSize = size * 0.35 * (1 - bassEnergy * 0.3)
      const pupilGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, pupilSize
      )
      pupilGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      pupilGradient.addColorStop(0.7, 'rgba(20, 20, 20, 0.95)')
      pupilGradient.addColorStop(1, 'rgba(60, 20, 20, 0.8)')
      
      ctx.fillStyle = pupilGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, pupilSize, 0, Math.PI * 2)
      ctx.fill()

      // Draw reflection/highlight
      const highlightSize = pupilSize * 0.3
      const highlightX = centerX - pupilSize * 0.3
      const highlightY = centerY - pupilSize * 0.3
      
      const highlightGradient = ctx.createRadialGradient(
        highlightX, highlightY, 0,
        highlightX, highlightY, highlightSize
      )
      highlightGradient.addColorStop(0, 'rgba(255, 200, 200, 0.6)')
      highlightGradient.addColorStop(1, 'rgba(255, 100, 100, 0)')
      
      ctx.fillStyle = highlightGradient
      ctx.beginPath()
      ctx.arc(highlightX, highlightY, highlightSize, 0, Math.PI * 2)
      ctx.fill()

      // Update and draw particles
      updateParticles()
      particlesRef.current.forEach(particle => {
        const life = 1 - particle.life / particle.maxLife
        ctx.fillStyle = `rgba(239, 68, 68, ${life * 0.8})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * life, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw scanline effect
      ctx.fillStyle = 'rgba(220, 38, 38, 0.03)'
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 2)
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, isListening])

  // Find and mirror ALL Strudel visualization canvases
  useEffect(() => {
    const mirrorCanvas = mirrorCanvasRef.current
    if (!mirrorCanvas) return

    const mirrorCtx = mirrorCanvas.getContext('2d', { willReadFrequently: false })
    if (!mirrorCtx) return

    // Reset canvas tracking when play state changes from stopped to playing
    if (isPlaying && !lastPlayingStateRef.current) {
      strudelCanvasesRef.current = []
    }
    lastPlayingStateRef.current = isPlaying

    // Scale canvas display to fill container width using CSS transform
    const scaleCanvasToFit = (canvas: HTMLCanvasElement) => {
      try {
        // Get the container width (the editor width)
        const container = canvas.closest('.cm-editor')
        if (!container) return
        
        const containerWidth = container.clientWidth
        const canvasWidth = canvas.width
        
        // On narrow screens, scale canvas to fill the full width
        const isNarrow = window.innerWidth < 768
        
        if (isNarrow && containerWidth > 0 && canvasWidth > 0) {
          // Calculate scale factor to fill container
          const scale = containerWidth / canvasWidth
          
          // Only scale if canvas is smaller than container (scale up)
          // or if it's significantly larger (scale down to fit)
          if (scale > 1.1 || scale < 0.9) {
            canvas.style.transform = `scale(${scale})`
            canvas.style.transformOrigin = 'left center'
            // Adjust height to account for scaling
            canvas.style.marginBottom = `${canvas.height * (scale - 1)}px`
          }
        } else {
          // Reset transform on wider screens
          canvas.style.transform = ''
          canvas.style.transformOrigin = ''
          canvas.style.marginBottom = ''
        }
      } catch (err) {
        // Ignore errors during scaling
      }
    }
    
    // Look for ALL Strudel canvas elements and clean up stale ones
    const checkForStrudelCanvases = () => {
      // Find all canvas elements in the document
      const allCanvases = document.querySelectorAll('canvas')
      const foundCanvases: HTMLCanvasElement[] = []
      const validCanvases: HTMLCanvasElement[] = []
      
      // First, validate existing canvases - remove any that are no longer in DOM or broken
      strudelCanvasesRef.current = strudelCanvasesRef.current.filter(canvas => {
        try {
          // Check if canvas is still in DOM and has valid dimensions
          if (canvas.isConnected && canvas.width > 0 && canvas.height > 0) {
            validCanvases.push(canvas)
            // Scale existing canvas if needed
            scaleCanvasToFit(canvas)
            return true
          }
        } catch (err) {
          // Canvas is broken, remove it
        }
        return false
      })
      
      // Then look for new canvases
      for (const canvas of Array.from(allCanvases)) {
        // Skip our canvases
        if (canvas === canvasRef.current || canvas === mirrorCanvas) continue
        
        // Look for Strudel widget canvases (start with _widget__)
        const id = canvas.id
        if (id && (id.startsWith('_widget__') || id.includes('scope') || id.includes('pianoroll') || id.includes('spiral') || id.includes('spectrum'))) {
          // Check if we already have this canvas
          if (!validCanvases.includes(canvas)) {
            try {
              // Validate canvas before adding
              if (canvas.isConnected && canvas.width > 0 && canvas.height > 0) {
                // Scale new canvas immediately
                scaleCanvasToFit(canvas)
                foundCanvases.push(canvas)
              }
            } catch (err) {
              // Skip invalid canvas
            }
          }
        }
      }
      
      // Add newly found canvases to our list
      if (foundCanvases.length > 0) {
        strudelCanvasesRef.current = [...strudelCanvasesRef.current, ...foundCanvases]
      }
    }

    // Copy ALL Strudel canvases to mirror canvas, distributed around the view
    const copyToMirror = () => {
      // Always schedule next frame first to ensure loop continues even if errors occur
      mirrorAnimationFrameRef.current = requestAnimationFrame(copyToMirror)
      
      if (!mirrorCanvas || !mirrorCtx) {
        return
      }

      try {
        // Clear mirror canvas
        mirrorCtx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height)
      } catch (err) {
        // Context might be lost, continue anyway
        return
      }
      
      // Draw each canvas in a different position
      const canvases = strudelCanvasesRef.current
      if (canvases.length === 0) {
        return
      }

      // Layout canvases with overlapping layers for depth effect
      const aspectRatio = mirrorCanvas.width / mirrorCanvas.height
      const isNarrow = aspectRatio < 0.75 // Portrait/narrow mode
      
      canvases.forEach((sourceCanvas, index) => {
        try {
          // Validate canvas before drawing
          if (!sourceCanvas || !sourceCanvas.isConnected || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
            return // Skip invalid/disconnected canvases
          }
          
          if (canvases.length === 1) {
            // Single canvas - fill the whole mirror, centered
            mirrorCtx.drawImage(sourceCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height)
          } else {
            // Multiple canvases - layer them with offsets and different sizes for depth
            const baseOpacity = mirrorCtx.globalAlpha
            // On narrow screens, reduce the scale difference to keep canvases larger
            const scaleFactor = isNarrow ? 0.08 : 0.12
            const scale = 1 - (index * scaleFactor) // Each layer slightly smaller
            
            // On narrow screens, reduce horizontal offset to keep centered
            const offsetXFactor = isNarrow ? 20 : 40
            const offsetYFactor = isNarrow ? 15 : 25
            const offsetX = (index * offsetXFactor) - (canvases.length * (offsetXFactor / 2)) // Distribute around center
            const offsetY = (index * offsetYFactor) - (canvases.length * (offsetYFactor / 2)) // Slight vertical offset too
            
            const w = mirrorCanvas.width * scale
            const h = mirrorCanvas.height * scale
            const x = (mirrorCanvas.width - w) / 2 + offsetX
            const y = (mirrorCanvas.height - h) / 2 + offsetY
            
            // Reduce opacity for layers behind to create depth
            mirrorCtx.globalAlpha = baseOpacity * (1 - index * 0.15)
            mirrorCtx.drawImage(sourceCanvas, x, y, w, h)
            mirrorCtx.globalAlpha = baseOpacity
          }
        } catch (err) {
          // Silently skip broken canvases - they'll be cleaned up in next validation pass
        }
      })
    }

    // Handle window resize to re-scale canvases
    const handleResizeCanvases = () => {
      strudelCanvasesRef.current.forEach(canvas => {
        scaleCanvasToFit(canvas)
      })
    }
    
    // Check periodically for Strudel canvases and clean up stale ones
    // More frequent checks to quickly recover from canvas recreation
    const searchInterval = setInterval(checkForStrudelCanvases, 250)
    checkForStrudelCanvases() // Check immediately

    window.addEventListener('resize', handleResizeCanvases)

    // Start mirroring loop
    copyToMirror()

    return () => {
      clearInterval(searchInterval)
      window.removeEventListener('resize', handleResizeCanvases)
      if (mirrorAnimationFrameRef.current) {
        cancelAnimationFrame(mirrorAnimationFrameRef.current)
      }
    }
  }, [isPlaying])

  // Handle canvas resize for both HAL eye and mirror canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const mirrorCanvas = mirrorCanvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const container = canvas.parentElement
      if (container) {
        // Resize HAL eye canvas
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        
        // Resize mirror canvas to match
        if (mirrorCanvas) {
          mirrorCanvas.width = container.clientWidth
          mirrorCanvas.height = container.clientHeight
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 overflow-hidden">
      {/* Strudel visualization mirror canvas - copies visualization frame-by-frame */}
      <canvas
        ref={mirrorCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
        style={{
          display: 'block',
          zIndex: 5,
          opacity: isPlaying ? 0.7 : 0.4,
          filter: isPlaying 
            ? 'blur(3px) brightness(1.5) saturate(1.5) contrast(1.3)' 
            : 'blur(5px) brightness(1.2) saturate(1.2)',
          mixBlendMode: 'screen',
          transform: 'scale(1.05)', // Reduced from 1.1 for better mobile visibility
          maskImage: 'radial-gradient(ellipse 80% 70% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)',
        }}
      />
      
      {/* HAL Eye Canvas - on top of Strudel viz */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          display: 'block',
          zIndex: 10,
        }}
      />
    </div>
  )
}

export default HalVisualization

