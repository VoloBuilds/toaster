import { useState, useEffect, useCallback, useRef } from 'react'
import { keyToMidi } from '../../lib/sequencer/keyMapping'

interface UseKeyboardInputOptions {
  enabled: boolean
  octaveOffset: number
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  onOctaveDown?: () => void
  onOctaveUp?: () => void
}

interface UseKeyboardInputReturn {
  activeKeys: Set<number>
}

export const useKeyboardInput = ({
  enabled,
  octaveOffset,
  onNoteOn,
  onNoteOff,
  onOctaveDown,
  onOctaveUp
}: UseKeyboardInputOptions): UseKeyboardInputReturn => {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set())
  
  // Track which keyboard keys are currently pressed (to prevent repeat events)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  // Store current octave offset in ref for event handlers
  const octaveOffsetRef = useRef(octaveOffset)
  
  // Store callbacks in refs so the effect doesn't need to re-run when they change
  const onNoteOnRef = useRef(onNoteOn)
  const onNoteOffRef = useRef(onNoteOff)
  const onOctaveDownRef = useRef(onOctaveDown)
  const onOctaveUpRef = useRef(onOctaveUp)
  
  // Keep refs updated
  useEffect(() => {
    octaveOffsetRef.current = octaveOffset
    onNoteOnRef.current = onNoteOn
    onNoteOffRef.current = onNoteOff
    onOctaveDownRef.current = onOctaveDown
    onOctaveUpRef.current = onOctaveUp
  })

  // Release all notes when component unmounts or becomes disabled
  const releaseAllNotes = useCallback(() => {
    // Get all currently active MIDI notes and release them
    pressedKeysRef.current.forEach(key => {
      const midi = keyToMidi(key, octaveOffsetRef.current)
      if (midi !== null) {
        onNoteOffRef.current(midi)
      }
    })
    pressedKeysRef.current.clear()
    setActiveKeys(new Set())
  }, [])

  useEffect(() => {
    if (!enabled) {
      releaseAllNotes()
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if any modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        return
      }
      
      // Ignore if focused on an input element
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      const key = e.key.toLowerCase()
      
      // Handle octave shift keys
      if (key === 'z') {
        e.preventDefault()
        onOctaveDownRef.current?.()
        return
      }
      if (key === 'x') {
        e.preventDefault()
        onOctaveUpRef.current?.()
        return
      }
      
      // Ignore key repeat events
      if (pressedKeysRef.current.has(key)) {
        return
      }
      
      const midi = keyToMidi(key, octaveOffsetRef.current)
      if (midi === null) {
        return
      }
      
      e.preventDefault()
      pressedKeysRef.current.add(key)
      setActiveKeys(prev => new Set(prev).add(midi))
      onNoteOnRef.current(midi)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      
      // Check if this key was pressed
      if (!pressedKeysRef.current.has(key)) {
        return
      }
      
      const midi = keyToMidi(key, octaveOffsetRef.current)
      if (midi === null) {
        return
      }
      
      pressedKeysRef.current.delete(key)
      setActiveKeys(prev => {
        const next = new Set(prev)
        next.delete(midi)
        return next
      })
      onNoteOffRef.current(midi)
    }

    // Release all notes when tab loses focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseAllNotes()
      }
    }

    // Release all notes when window loses focus
    const handleBlur = () => {
      releaseAllNotes()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      releaseAllNotes()
    }
  }, [enabled, releaseAllNotes])

  return { activeKeys }
}

