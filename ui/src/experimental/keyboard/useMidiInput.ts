import { useState, useEffect, useCallback, useRef } from 'react'

interface UseMidiInputOptions {
  enabled: boolean
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
}

interface UseMidiInputReturn {
  isSupported: boolean
  isConnected: boolean
  deviceName: string | null
  activeKeys: Set<number>
}

export const useMidiInput = ({
  enabled,
  onNoteOn,
  onNoteOff
}: UseMidiInputOptions): UseMidiInputReturn => {
  const [isSupported] = useState(() => 'requestMIDIAccess' in navigator)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set())
  
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const activeInputsRef = useRef<Set<MIDIInput>>(new Set())

  // Parse and handle MIDI message
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data
    if (!data || data.length < 2) return
    
    const status = data[0]
    const note = data[1]
    const velocity = data[2] || 0
    
    // Note On: 0x90-0x9F (144-159)
    // Note Off: 0x80-0x8F (128-143)
    // Note On with velocity 0 is treated as Note Off
    
    const isNoteOn = (status & 0xF0) === 0x90 && velocity > 0
    const isNoteOff = (status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && velocity === 0)
    
    if (isNoteOn) {
      setActiveKeys(prev => new Set(prev).add(note))
      onNoteOn(note)
    } else if (isNoteOff) {
      setActiveKeys(prev => {
        const next = new Set(prev)
        next.delete(note)
        return next
      })
      onNoteOff(note)
    }
  }, [onNoteOn, onNoteOff])

  // Connect to a MIDI input device
  const connectInput = useCallback((input: MIDIInput) => {
    if (activeInputsRef.current.has(input)) return
    
    input.onmidimessage = handleMidiMessage
    activeInputsRef.current.add(input)
    setIsConnected(true)
    setDeviceName(input.name || 'Unknown MIDI Device')
    
    console.log('[MIDI] Connected to:', input.name)
  }, [handleMidiMessage])

  // Disconnect from a MIDI input device
  const disconnectInput = useCallback((input: MIDIInput) => {
    input.onmidimessage = null
    activeInputsRef.current.delete(input)
    
    if (activeInputsRef.current.size === 0) {
      setIsConnected(false)
      setDeviceName(null)
    }
  }, [])

  // Set up MIDI access
  useEffect(() => {
    if (!isSupported || !enabled) {
      // Disconnect all if disabled
      activeInputsRef.current.forEach(input => {
        input.onmidimessage = null
      })
      activeInputsRef.current.clear()
      setIsConnected(false)
      setDeviceName(null)
      return
    }

    const setupMidi = async () => {
      try {
        const access = await navigator.requestMIDIAccess()
        midiAccessRef.current = access
        
        // Connect to all available inputs
        access.inputs.forEach(input => {
          if (input.state === 'connected') {
            connectInput(input)
          }
        })
        
        // Listen for device connections/disconnections
        access.onstatechange = (event: MIDIConnectionEvent) => {
          const port = event.port
          if (port?.type !== 'input') return
          
          const input = port as MIDIInput
          
          if (input.state === 'connected') {
            connectInput(input)
          } else if (input.state === 'disconnected') {
            disconnectInput(input)
          }
        }
      } catch (error) {
        console.warn('[MIDI] Failed to get MIDI access:', error)
      }
    }

    setupMidi()

    return () => {
      // Cleanup
      activeInputsRef.current.forEach(input => {
        input.onmidimessage = null
      })
      activeInputsRef.current.clear()
      
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null
      }
    }
  }, [isSupported, enabled, connectInput, disconnectInput])

  return {
    isSupported,
    isConnected,
    deviceName,
    activeKeys
  }
}

