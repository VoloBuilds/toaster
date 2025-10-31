import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from './ui/button'

interface ClearButtonProps {
  onClear: () => void
  disabled?: boolean
}

const ClearButton = ({ onClear, disabled = false }: ClearButtonProps) => {
  const [warning, setWarning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to dismiss warning
  useEffect(() => {
    if (!warning) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setWarning(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [warning])

  const handleClick = () => {
    if (warning) {
      // Second click - confirm clear
      setWarning(false)
      onClear()
    } else {
      // First click - show warning
      setWarning(true)
    }
  }

  return (
    <div ref={containerRef} className="flex items-center">
      <Button
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        className={`bg-transparent hover:bg-transparent border-0 p-2 h-auto transition-colors pointer-events-auto ${
          warning ? 'text-red-500 hover:text-red-400' : 'text-slate-400 hover:text-white'
        }`}
        variant="ghost"
      >
        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      {warning && (
        <span className="text-red-500 text-xs font-mono whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200 ml-2 pointer-events-none">
          Confirm reset?
        </span>
      )}
    </div>
  )
}

export default ClearButton

